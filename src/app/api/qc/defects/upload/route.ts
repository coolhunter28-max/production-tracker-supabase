import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { uploadToR2 } from "@/lib/r2";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const defectId = formData.get("defect_id") as string | null;

    if (!file || !defectId) {
      return NextResponse.json(
        { error: "Missing file or defect_id" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `qc/defects/${defectId}/${Date.now()}-${file.name}`;

    const photoUrl = await uploadToR2({
      file: buffer,
      fileName,
      contentType: file.type,
    });

    const { data, error } = await supabase
      .from("qc_defect_photos")
      .insert({
        defect_id: defectId,
        photo_url: photoUrl,
        photo_name: file.name,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "DB insert failed" },
        { status: 500 }
      );
    }

    // 👇 RESPUESTA COMPLETA Y CLARA
    return NextResponse.json({
      id: data.id,
      photo_url: data.photo_url,
    });
  } catch (error) {
    console.error("QC defect image upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
