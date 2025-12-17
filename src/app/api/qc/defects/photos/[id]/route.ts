import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deleteFromR2 } from "@/lib/r2";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function keyFromPublicUrl(photoUrl: string) {
  const base = process.env.R2_PUBLIC_URL!;
  // photoUrl = `${base}/${key}`
  return photoUrl.startsWith(base + "/") ? photoUrl.slice(base.length + 1) : "";
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const photoId = params.id;

    // 1) Leer la fila para saber qué borrar en R2
    const { data: photo, error: readErr } = await supabase
      .from("qc_defect_photos")
      .select("id, photo_url")
      .eq("id", photoId)
      .single();

    if (readErr || !photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // 2) Borrar objeto en R2
    const key = keyFromPublicUrl(photo.photo_url);
    if (key) {
      await deleteFromR2(key);
    }

    // 3) Borrar fila en Supabase
    const { error: delErr } = await supabase
      .from("qc_defect_photos")
      .delete()
      .eq("id", photoId);

    if (delErr) {
      return NextResponse.json({ error: "DB delete failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("QC delete photo error:", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
