// src/app/api/variantes/[varianteId]/imagenes/[imageId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function assertEnv() {
  const required = ["R2_ENDPOINT", "R2_BUCKET_NAME", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];
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

export async function DELETE(
  _req: Request,
  { params }: { params: { varianteId: string; imageId: string } }
) {
  try {
    assertEnv();

    const varianteId = params.varianteId;
    const imageId = params.imageId;

    if (!varianteId) return NextResponse.json({ error: "varianteId is required" }, { status: 400 });
    if (!imageId) return NextResponse.json({ error: "imageId is required" }, { status: 400 });

    // 1) Cargar imagen y validar pertenencia a variante
    const { data: img, error: imgErr } = await supabase
      .from("modelo_imagenes")
      .select("id, file_key, variante_id")
      .eq("id", imageId)
      .single();

    if (imgErr || !img) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    if (img.variante_id !== varianteId) {
      return NextResponse.json({ error: "La imagen no pertenece a esta variante" }, { status: 403 });
    }

    // 2) Borrar del bucket
    const r2 = getR2Client();
    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: img.file_key,
      })
    );

    // 3) Borrar registro
    const { data: deleted, error: delErr } = await supabase
      .from("modelo_imagenes")
      .delete()
      .eq("id", imageId)
      .select("*")
      .single();

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ status: "ok", deleted });
  } catch (e: any) {
    console.error("delete variante image error:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
