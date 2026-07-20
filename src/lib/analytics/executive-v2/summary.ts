import {
    resolveExecutiveAnalysisContext,
    type ExecutiveAnalysisContext,
  } from "@/lib/analytics/executive-v2/analysis-context";
  import { createClient } from "@/lib/supabase";
  
  export type ExecutiveSummaryFilters = {
    season?: string;
    customer?: string;
    factory?: string;
  
    /**
     * El histórico nunca se activa implícitamente.
     * Debe solicitarse expresamente.
     */
    historical?: boolean;
  };
  
  export type ExecutiveSummary = {
    context: {
      type: ExecutiveAnalysisContext["type"];
      label: string;
      seasons: string[];
      isHistorical: boolean;
  
      /**
       * Se mantiene para compatibilidad con los componentes actuales.
       * Solo tiene valor cuando se ha seleccionado una temporada concreta.
       */
      season: string | null;
  
      customer: string | null;
      factory: string | null;
    };
  
    activity: {
      poCount: number;
      customerCount: number;
      modelCount: number;
      quantityTotal: number;
    };
  
    business: {
      salesAmount: number;
      purchaseAmount: number;
      contributionAmount: number;
      contributionPercent: number | null;
    };
  
    operations: {
      bsg: {
        salesMixPercent: number | null;
        marginAmount: number;
        marginPercent: number | null;
      };
  
      xiamenDic: {
        salesMixPercent: number | null;
        marginAmount: number;
        marginPercent: number | null;
      };
    };
  };
  
  type ExecutiveSummaryRpcRow = {
    po_count: unknown;
    line_count: unknown;
    customer_count: unknown;
    factory_count: unknown;
    model_count: unknown;
    qty_total: unknown;
    sell_amount_total: unknown;
    buy_amount_total: unknown;
    margin_bsg_total: unknown;
    margin_xiamen_total: unknown;
    contribution_total: unknown;
    contribution_pct: unknown;
    xiamen_sales_mix_pct: unknown;
    bsg_sales_mix_pct: unknown;
    xiamen_margin_pct: unknown;
    bsg_margin_pct: unknown;
  };
  
  function cleanFilter(value?: string): string | null {
    const cleaned = value?.trim();
  
    return cleaned || null;
  }
  
  function toNumber(value: unknown): number {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }
  
    if (typeof value === "string") {
      const parsed = Number(value);
  
      return Number.isFinite(parsed) ? parsed : 0;
    }
  
    return 0;
  }
  
  function toNullableNumber(value: unknown): number | null {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }
  
    if (typeof value === "number") {
      return Number.isFinite(value)
        ? value
        : null;
    }
  
    if (typeof value === "string") {
      const parsed = Number(value);
  
      return Number.isFinite(parsed)
        ? parsed
        : null;
    }
  
    return null;
  }
  
  function emptyRpcRow(): ExecutiveSummaryRpcRow {
    return {
      po_count: 0,
      line_count: 0,
      customer_count: 0,
      factory_count: 0,
      model_count: 0,
      qty_total: 0,
      sell_amount_total: 0,
      buy_amount_total: 0,
      margin_bsg_total: 0,
      margin_xiamen_total: 0,
      contribution_total: 0,
      contribution_pct: null,
      xiamen_sales_mix_pct: null,
      bsg_sales_mix_pct: null,
      xiamen_margin_pct: null,
      bsg_margin_pct: null,
    };
  }
  
  function mapExecutiveSummary(
    row: ExecutiveSummaryRpcRow,
    filters: ExecutiveSummaryFilters,
    analysisContext: ExecutiveAnalysisContext
  ): ExecutiveSummary {
    const explicitSeason =
      analysisContext.type === "SINGLE_SEASON"
        ? analysisContext.seasons[0] ?? null
        : null;
  
    return {
      context: {
        type: analysisContext.type,
        label: analysisContext.label,
        seasons: analysisContext.seasons,
        isHistorical: analysisContext.isHistorical,
        season: explicitSeason,
        customer: cleanFilter(filters.customer),
        factory: cleanFilter(filters.factory),
      },
  
      activity: {
        poCount: toNumber(row.po_count),
        customerCount: toNumber(
          row.customer_count
        ),
        modelCount: toNumber(row.model_count),
        quantityTotal: toNumber(row.qty_total),
      },
  
      business: {
        salesAmount: toNumber(
          row.sell_amount_total
        ),
        purchaseAmount: toNumber(
          row.buy_amount_total
        ),
        contributionAmount: toNumber(
          row.contribution_total
        ),
        contributionPercent: toNullableNumber(
          row.contribution_pct
        ),
      },
  
      operations: {
        bsg: {
          salesMixPercent: toNullableNumber(
            row.bsg_sales_mix_pct
          ),
          marginAmount: toNumber(
            row.margin_bsg_total
          ),
          marginPercent: toNullableNumber(
            row.bsg_margin_pct
          ),
        },
  
        xiamenDic: {
          salesMixPercent: toNullableNumber(
            row.xiamen_sales_mix_pct
          ),
          marginAmount: toNumber(
            row.margin_xiamen_total
          ),
          marginPercent: toNullableNumber(
            row.xiamen_margin_pct
          ),
        },
      },
    };
  }
  
  export async function getExecutiveSummary(
    filters: ExecutiveSummaryFilters = {}
  ): Promise<ExecutiveSummary> {
    const analysisContext =
      await resolveExecutiveAnalysisContext({
        season: filters.season,
        historical: filters.historical,
      });
  
    const supabase = await createClient();
  
    const { data, error } = await supabase.rpc(
      "get_exec_summary_context_v2",
      {
        p_seasons: analysisContext.isHistorical
          ? null
          : analysisContext.seasons,
  
        p_include_all:
          analysisContext.isHistorical,
  
        p_customer: cleanFilter(
          filters.customer
        ),
  
        p_factory: cleanFilter(
          filters.factory
        ),
      }
    );
  
    if (error) {
      throw new Error(
        `[getExecutiveSummary] No se pudo cargar el resumen ejecutivo: ${error.message}`
      );
    }
  
    const rows =
      (data ?? []) as unknown as ExecutiveSummaryRpcRow[];
  
    return mapExecutiveSummary(
      rows[0] ?? emptyRpcRow(),
      filters,
      analysisContext
    );
  }