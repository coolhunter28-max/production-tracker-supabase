// src/app/api/variantes/[varianteId]/imagenes/upload/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// -------------------------------------------------------------
// ENV + Helpers
// -------------------------------------------------------------
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

export async function POST(
  req: Request,
  { params }: { params: { varianteId: string } }
) {
  try {
    assertEnv();

    const varianteId = params.varianteId;
    if (!varianteId) {
      return NextResponse.json({ error: "varianteId is required" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    // permitimos kind por si mañana quieres "main" de variante, por ahora: default gallery
    const kindRaw = (formData.get("kind") as string | null) ?? "gallery";
    const kind = ["main", "gallery", "tech", "other"].includes(kindRaw) ? kindRaw : "gallery";

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
      return NextResponse.json({ error: `Imagen demasiado grande. Máx ${MAX_MB}MB.` }, { status: 400 });
    }

    // 1) Cargar variante + modelo (para path bonito)
    const { data: variante, error: vErr } = await supabase
      .from("modelo_variantes")
      .select("id, modelo_id, season, color")
      .eq("id", varianteId)
      .single();

    if (vErr || !variante) {
      return NextResponse.json({ error: "Variante no existe" }, { status: 404 });
    }

    const { data: modelo, error: mErr } = await supabase
      .from("modelos")
      .select("id, style")
      .eq("id", variante.modelo_id)
      .single();

    if (mErr || !modelo) {
      return NextResponse.json({ error: "Modelo no existe" }, { status: 404 });
    }

    const safeStyle = sanitizeFilename(String(modelo.style || modelo.id));
    const safeSeason = sanitizeFilename(String(variante.season || "season"));
    const safeColor = sanitizeFilename(String(variante.color || "color"));

    // 2) Subir a R2
    const r2 = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME!;

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const original = sanitizeFilename(file.name || `image.${ext}`);
    const stamp = Date.now();

    const fileKey = `variantes/${safeStyle}/${safeSeason}_${safeColor}/${kind}/${stamp}_${original || `img.${ext}`}`;
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

    // 3) Guardar en BD: modelo_imagenes (ligado SIEMPRE a variante_id)
    // Si es main de variante: degradamos anteriores main -> gallery en esa variante
    if (kind === "main") {
      await supabase
        .from("modelo_imagenes")
        .update({ kind: "gallery" })
        .eq("variante_id", varianteId)
        .eq("kind", "main");
    }

    const { data: inserted, error: insErr } = await supabase
      .from("modelo_imagenes")
      .insert([
        {
          modelo_id: variante.modelo_id,
          variante_id: varianteId,
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

    return NextResponse.json({
      status: "ok",
      variante_id: varianteId,
      kind,
      file_key: fileKey,
      public_url: publicUrl,
      record: inserted,
    });
  } catch (e: any) {
    console.error("upload variante image error:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
