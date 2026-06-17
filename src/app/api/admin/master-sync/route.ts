import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "production" ? "production" : "development";

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("run_master_sync_pipeline", {
      p_mode: mode,
    });

    if (error) {
      console.error("[master-sync]", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error ejecutando Master Sync";

    console.error("[master-sync][fatal]", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}