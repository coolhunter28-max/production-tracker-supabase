import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

// GET: obtener un PO con líneas + muestras
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabase
    .from("pos")
    .select("*, lineas_pedido(*, muestras(*))")
    .eq("id", params.id)
    .single();

  if (error) {
    console.error("❌ Error obteniendo PO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/* ---------------- helpers (SIN CAMBIOS) ---------------- */
// ... (todo tu bloque de helpers TAL CUAL)
// cleanObject, normText, ensureModeloId, ensureVarianteId, etc
/* ------------------------------------------------------- */

// PUT: actualizar PO + líneas + muestras
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  try {
    /* ---- TODO tu código PUT EXACTAMENTE IGUAL ---- */
    console.log("✅ PO actualizado correctamente");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error actualizando PO:", error);
    return NextResponse.json(
      { message: error.message || "Error actualizando PO" },
      { status: 500 }
    );
  }
}

// DELETE: eliminar un PO (con cascade en BD)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: existing, error: findErr } = await supabase
      .from("pos")
      .select("id, po")
      .eq("id", params.id)
      .maybeSingle();

    if (findErr) {
      console.error("❌ Error buscando PO:", findErr);
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json(
        { error: "PO no encontrado" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("pos")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error("❌ Error eliminando PO:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error inesperado" },
      { status: 500 }
    );
  }
}