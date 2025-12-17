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

    const file = formData.get("file") as File;
    const defectId = formData.get("defect_id") as string;

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

    const { error } = await supabase
      .from("qc_defect_photos")
      .insert({
        defect_id: defectId,
        photo_url: photoUrl,
        photo_name: file.name,
      });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "DB insert failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ photo_url: photoUrl });
  } catch (error) {
    console.error("QC defect image upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
