import "server-only";

import { createClient } from "@supabase/supabase-js";

export type AnalyticsSyncSource =
  | "po.create"
  | "po.update"
  | "po.delete"
  | "import.spain"
  | "import.china"
  | "admin.manual"
  | "manual.validation"
  | (string & {});

export type SyncAnalyticsOptions = {
  source: AnalyticsSyncSource;
  requestedBy?: string | null;
};

export type AnalyticsSyncSuccess = {
  ok: true;
  status: "SUCCESS";
  syncedAt: string;
  durationMs: number;
  errorMessage: null;
};

export type AnalyticsSyncFailure = {
  ok: false;
  status: "FAILED";
  syncedAt: null;
  durationMs: number | null;
  errorMessage: string;
};

export type AnalyticsSyncResult =
  | AnalyticsSyncSuccess
  | AnalyticsSyncFailure;

type SyncAnalyticsRpcRow = {
  ok: boolean;
  status: string;
  synced_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
};

function cleanOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function getAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "No está configurada la variable NEXT_PUBLIC_SUPABASE_URL."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "No está configurada la variable SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function failureResult(
  errorMessage: string,
  durationMs: number | null = null
): AnalyticsSyncFailure {
  return {
    ok: false,
    status: "FAILED",
    syncedAt: null,
    durationMs,
    errorMessage,
  };
}

/**
 * Sincroniza la capa Analytics con la realidad operativa.
 *
 * Esta función nunca debe impedir que una operación de negocio
 * correctamente guardada finalice con éxito.
 *
 * Los fallos se devuelven como resultado explícito y también se registran
 * en consola. Cuando la llamada alcanza PostgreSQL, la función
 * sync_analytics_v2 registra además el estado en analytics_sync_status.
 */
export async function syncAnalytics(
  options: SyncAnalyticsOptions
): Promise<AnalyticsSyncResult> {
  const source = cleanOptionalText(options.source);

  if (!source) {
    const result = failureResult(
      "No se ha indicado el origen de la sincronización de Analytics."
    );

    console.error("[ANALYTICS_SYNC_FAILED]", {
      source: null,
      requestedBy: cleanOptionalText(options.requestedBy),
      error: result.errorMessage,
    });

    return result;
  }

  const requestedBy = cleanOptionalText(options.requestedBy);

  try {
    const supabase = getAdminSupabaseClient();

    const { data, error } = await supabase.rpc("sync_analytics_v2", {
      p_source: source,
      p_requested_by: requestedBy,
    });

    if (error) {
      const result = failureResult(error.message);

      console.error("[ANALYTICS_SYNC_FAILED]", {
        source,
        requestedBy,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return result;
    }

    const rows = (data ?? []) as SyncAnalyticsRpcRow[];
    const row = rows[0];

    if (!row) {
      const result = failureResult(
        "La función sync_analytics_v2 no devolvió ningún resultado."
      );

      console.error("[ANALYTICS_SYNC_FAILED]", {
        source,
        requestedBy,
        error: result.errorMessage,
      });

      return result;
    }

    if (
      row.ok === true &&
      row.status === "SUCCESS" &&
      typeof row.synced_at === "string"
    ) {
      const result: AnalyticsSyncSuccess = {
        ok: true,
        status: "SUCCESS",
        syncedAt: row.synced_at,
        durationMs: Number(row.duration_ms ?? 0),
        errorMessage: null,
      };

      console.info("[ANALYTICS_SYNC_SUCCESS]", {
        source,
        requestedBy,
        syncedAt: result.syncedAt,
        durationMs: result.durationMs,
      });

      return result;
    }

    const result = failureResult(
      row.error_message ??
        "La sincronización de Analytics terminó sin éxito.",
      row.duration_ms
    );

    console.error("[ANALYTICS_SYNC_FAILED]", {
      source,
      requestedBy,
      durationMs: result.durationMs,
      error: result.errorMessage,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Error desconocido sincronizando Analytics.";

    const result = failureResult(errorMessage);

    console.error("[ANALYTICS_SYNC_FAILED]", {
      source,
      requestedBy,
      error: errorMessage,
    });

    return result;
  }
}
