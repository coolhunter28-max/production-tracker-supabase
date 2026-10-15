import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { requireApiAccess } from "@/lib/api-access";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------- helpers ----------------
function assertEnv() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "R2_ENDPOINT",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
  ];
  for (const k of required) {
    if (!process.env[k]) throw new Error(`Missing env var: ${k}`);
  }
}

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function sanitizeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "");
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

function isAllowedMime(mime: string) {
  return mime === "image/jpeg" || mime === "image/png" || mime === "image/webp";
}

// ---------------- POST ----------------
// POST /api/modelos/:id/imagenes/upload
// -> SOLO MAIN (opción A)
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authorization = await requireApiAccess({ roles: ["ADMIN", "MANAGER"] });
    if (!authorization.ok) return authorization.response;

    assertEnv();

    const modeloId = params.id;
    if (!modeloId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    // IMPORTANTE: ignoramos kind del cliente y forzamos main
    const kind = "main";

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!isAllowedMime(file.type)) {
      return NextResponse.json(
        { error: `Formato no permitido (${file.type}). Usa JPG/PNG/WEBP.` },
        { status: 400 }
      );
    }

    const MAX_MB = 15;
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Imagen demasiado grande. Máx ${MAX_MB}MB.` },
        { status: 400 }
      );
    }

    // 1) Verificar modelo y obtener style
    const { data: modelo, error: modeloErr } = await supabase
      .from("modelos")
      .select("id, style")
      .eq("id", modeloId)
      .single();

    if (modeloErr || !modelo) {
      return NextResponse.json({ error: "Modelo no existe" }, { status: 404 });
    }

    const style = String(modelo.style || modeloId);
    const safeStyle = sanitizeFilename(style);

    // 2) Subir a R2
    const r2 = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME!;

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
        ? "webp"
        : "jpg";

    const original = sanitizeFilename(file.name || `image.${ext}`);
    const stamp = Date.now();
    const fileKey = `modelos/${safeStyle}/main/${stamp}_${original || `img.${ext}`}`;

    const body = Buffer.from(await file.arrayBuffer());

    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        Body: body,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const publicUrl = `${normalizeBaseUrl(process.env.R2_PUBLIC_URL!)}/${fileKey}`;

    // 3) Si existía main anterior (del modelo), lo degradamos a gallery? NO.
    // Opción A: el modelo solo tiene main, así que borramos/convertimos anteriores main a "gallery" NO tendría sentido.
    // Aquí lo más seguro: borrar anteriores main del modelo en BD (no en R2). Para no liarla, lo hacemos simple:
    await supabase
      .from("modelo_imagenes")
      .delete()
      .eq("modelo_id", modeloId)
      .is("variante_id", null)
      .eq("kind", "main");

    // 4) Insertar en modelo_imagenes con variante_id NULL
    const { data: inserted, error: insErr } = await supabase
      .from("modelo_imagenes")
      .insert([
        {
          modelo_id: modeloId,
          variante_id: null,
          file_key: fileKey,
          public_url: publicUrl,
          kind,
          sort_order: 0,
          mime_type: file.type,
          size_bytes: file.size,
        },
      ])
      .select()
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // 5) actualizar modelos.picture_url
    await supabase.from("modelos").update({ picture_url: publicUrl }).eq("id", modeloId);

    return NextResponse.json({
      status: "ok",
      modelo_id: modeloId,
      kind,
      file_key: fileKey,
      public_url: publicUrl,
      record: inserted,
    });
  } catch (e: any) {
    console.error("upload modelo main error:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
