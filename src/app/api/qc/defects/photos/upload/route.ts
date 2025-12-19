import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { uploadToR2 } from "@/lib/r2";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function safePart(input: string) {
  return (input || "unknown")
    .trim()
    .replace(/[\/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "_");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const defectId = form.get("defect_id") as string;
    const po = form.get("po") as string;
    const reference = form.get("reference") as string;
    const style = form.get("style") as string;
    const color = form.get("color") as string;
    const file = form.get("file") as File;

    if (!defectId || !file) {
      return NextResponse.json(
        { error: "Missing defect_id or file" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `defect_${Date.now()}.${ext}`;

    const key = `qc/defects/${safePart(po)}/${safePart(
      reference
    )}/${safePart(style)}/${safePart(color)}/${defectId}/${fileName}`;

    const photoUrl = await uploadToR2({
      file: buffer,
      fileName: key,
      contentType: file.type || "image/jpeg",
    });

    const { data, error } = await supabase
      .from("qc_defect_photos")
      .insert({
        defect_id: defectId,
        photo_url: photoUrl,
        photo_name: fileName,
      })
      .select("id, photo_url")
      .single();

    if (error || !data) {
      throw error;
    }

    // 👉 RESPUESTA EXACTA que espera el grid
    return NextResponse.json({
      id: data.id,
      photo_url: data.photo_url,
    });
  } catch (err: any) {
    console.error("QC defect upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
