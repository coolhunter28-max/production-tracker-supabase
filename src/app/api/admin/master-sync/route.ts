import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

type MasterSyncMode = "development" | "operational";

function parseMode(value: unknown): MasterSyncMode {
  if (value === "operational") return "operational";
  return "development";
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = parseMode(body?.mode);

    const supabase = createClient();

    const { data, error } = await supabase.rpc("run_master_sync_pipeline", {
      p_mode: mode,
    });

    if (error) {
      console.error("[master-sync] RPC error", error);

      return NextResponse.json(
        {
          ok: false,
          message: "Master Sync failed",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      mode,
      result: data,
    });
  } catch (error) {
    console.error("[master-sync] unexpected error", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unexpected Master Sync error",
      },
      { status: 500 },
    );
  }
}