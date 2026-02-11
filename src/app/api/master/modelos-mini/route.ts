import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/master/modelos-mini
// Lista SIMPLE de modelos para usar en el editor de PO
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("modelos")
      .select(
        `
        id,
        style,
        reference,
        customer,
        supplier,
        factory,
        status
      `
      )
      .order("style", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: data || [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
