// src/app/api/modelos/[id]/imagenes/[imageId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getR2Client() {
  const endpoint = process.env.R2_ENDPOINT!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const modeloId = params.id;
    const imageId = params.imageId;

    if (!modeloId || !imageId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // 1) Leer registro para obtener file_key + kind
    const { data: img, error: readErr } = await supabase
      .from("modelo_imagenes")
      .select("id, modelo_id, file_key, public_url, kind")
      .eq("id", imageId)
      .eq("modelo_id", modeloId)
      .single();

    if (readErr || !img) {
      return NextResponse.json(
        { error: "Imagen no encontrada" },
        { status: 404 }
      );
    }

    // 2) Borrar en R2
    const bucket = process.env.R2_BUCKET_NAME!;
    const s3 = getR2Client();

    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: img.file_key,
      })
    );

    // 3) Borrar fila en BD
    const { error: delErr } = await supabase
      .from("modelo_imagenes")
      .delete()
      .eq("id", imageId);

    if (delErr) {
      return NextResponse.json(
        { error: "No se pudo borrar el registro en BD" },
        { status: 500 }
      );
    }

    // 4) Si era MAIN, limpiar picture_url del modelo
    if (img.kind === "main") {
      await supabase
        .from("modelos")
        .update({ picture_url: null })
        .eq("id", modeloId);
    }

    return NextResponse.json({
      status: "ok",
      deleted: { id: imageId, file_key: img.file_key, kind: img.kind },
    });
  } catch (e: any) {
    console.error("❌ delete modelo image:", e);
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
