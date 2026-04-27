import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getCustomerDetailBundle } from "@/lib/analytics/clientes";
import type { CustomerBusinessProfile } from "@/types/clientes";

function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined) return "-";

  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatPercent(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined) return "-";

  return `${new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}%`;
}

function isXiamenDominant(xiamenMix: number | null | undefined) {
  return xiamenMix !== null && xiamenMix !== undefined && xiamenMix >= 70;
}

function isBSGDominant(bsgMix: number | null | undefined) {
  return bsgMix !== null && bsgMix !== undefined && bsgMix >= 70;
}

function getContextualProfileLabel(
  profile: string | null | undefined,
  xiamenMix: number | null | undefined
) {
  if (profile === "RISKY" && isXiamenDominant(xiamenMix)) {
    return "DEMANDING (Xiamen)";
  }

  return profile ?? "-";
}

function getContextualProfileBadgeClass(
  profile: string | null | undefined,
  xiamenMix: number | null | undefined
) {
  if (profile === "RISKY" && isXiamenDominant(xiamenMix)) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  switch (profile) {
    case "STRATEGIC":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "PROFITABLE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "NEGOTIATOR":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "RISKY":
      return "bg-red-50 text-red-700 ring-red-200";
    case "LOW_VALUE":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

function getInsightToneClass(
  tone: "positive" | "warning" | "risk" | "neutral"
) {
  switch (tone) {
    case "positive":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "warning":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "risk":
      return "bg-red-50 text-red-800 ring-red-200";
    case "neutral":
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

function getVolumeSignalBadgeClass(signal: string | null | undefined) {
  switch (signal) {
    case "VOLUME_DROP_RISK":
      return "bg-red-50 text-red-700 ring-red-200";
    case "VOLUME_SOFT_DROP":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "GROWING":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "STABLE":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "NO_BASELINE":
      return "bg-slate-50 text-slate-700 ring-slate-200";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

function getBusinessCardTitle(xiamenMix: number | null | undefined) {
  return isXiamenDominant(xiamenMix) ? "Business Score (BI)" : "Business Score";
}

function getBusinessCardHelper(xiamenMix: number | null | undefined) {
  return isXiamenDominant(xiamenMix)
    ? "Indicador global de BI. En cuentas Xiamen el KPI principal es volumen y continuidad."
    : "Score consolidado de negocio";
}

function getFrictionCardTitle(xiamenMix: number | null | undefined) {
  return isXiamenDominant(xiamenMix) ? "Coordination Load" : "Friction Score";
}

function getFrictionCardHelper(xiamenMix: number | null | undefined) {
  return isXiamenDominant(xiamenMix)
    ? "En cuentas Xiamen léelo como complejidad de coordinación, no como riesgo puro."
    : "Nivel consolidado de fricción";
}

function ContextualProfileBadge({
  profile,
  xiamenMix,
}: {
  profile: CustomerBusinessProfile | string | null;
  xiamenMix: number | null | undefined;
}) {
  const label = getContextualProfileLabel(profile, xiamenMix);

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getContextualProfileBadgeClass(
        profile,
        xiamenMix
      )}`}
    >
      {label}
    </span>
  );
}

function VolumeSignalBadge({ signal }: { signal: string | null | undefined }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getVolumeSignalBadgeClass(
        signal
      )}`}
    >
      {signal ?? "-"}
    </span>
  );
}

function NeutralBadge({ label }: { label: string | null | undefined }) {
  return (
    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset bg-muted text-muted-foreground ring-border">
      {label ?? "-"}
    </span>
  );
}

function MetricCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {helper ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function DetailSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-sm font-medium text-right">{value}</div>
    </div>
  );
}

function InsightCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "positive" | "warning" | "risk" | "neutral";
}) {
  return (
    <div
      className={`rounded-2xl p-4 ring-1 ring-inset ${getInsightToneClass(
        tone
      )}`}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6">{body}</p>
    </div>
  );
}

function buildVolumeInsight(
  detail: Awaited<ReturnType<typeof getCustomerDetailBundle>>
) {
  const latestVolumeRow = detail.xiamenVolumeEvolution.at(-1);

  if (!latestVolumeRow) {
    return null;
  }

  if (latestVolumeRow.volume_signal === "VOLUME_DROP_RISK") {
    return {
      title: "Riesgo real por caída de volumen",
      body: `La última temporada (${latestVolumeRow.season}) muestra una caída de volumen de ${formatPercent(
        latestVolumeRow.qty_growth_pct,
        2
      )} frente a ${latestVolumeRow.previous_season}. En Xiamen esta es una señal crítica.`,
      tone: "risk" as const,
    };
  }

  if (latestVolumeRow.volume_signal === "VOLUME_SOFT_DROP") {
    return {
      title: "Caída moderada de volumen",
      body: `La última temporada muestra una caída de volumen de ${formatPercent(
        latestVolumeRow.qty_growth_pct,
        2
      )}. No es crítica, pero conviene monitorizar la siguiente season.`,
      tone: "warning" as const,
    };
  }

  if (latestVolumeRow.volume_signal === "GROWING") {
    return {
      title: "Cliente en crecimiento",
      body: `La última temporada muestra crecimiento de volumen de ${formatPercent(
        latestVolumeRow.qty_growth_pct,
        2
      )}. En Xiamen esto refuerza el valor de la cuenta.`,
      tone: "positive" as const,
    };
  }

  const qty = detail.operations?.qty_total;
  const xiamenMix = detail.operations?.xiamen_sales_mix_pct;

  if (!isXiamenDominant(xiamenMix) || qty === null || qty === undefined) {
    return null;
  }

  if (qty >= 100000) {
    return {
      title: "Cliente de alto volumen",
      body: "El cliente maneja un volumen elevado de producción. En operativas tipo Xiamen, este es un indicador principal de valor y continuidad.",
      tone: "positive" as const,
    };
  }

  return null;
}

function buildExecutiveInsights(
  detail: Awaited<ReturnType<typeof getCustomerDetailBundle>>
) {
  const insights: Array<{
    title: string;
    body: string;
    tone: "positive" | "warning" | "risk" | "neutral";
  }> = [];

  const volumeInsight = buildVolumeInsight(detail);

  if (volumeInsight) {
    insights.push(volumeInsight);
  }

  const profile = detail.business?.customer_business_profile;
  const businessScore = detail.business?.customer_business_score;
  const frictionScore = detail.business?.customer_friction_score;
  const contributionPct = detail.operations?.contribution_pct;
  const productionDelay = detail.operations?.avg_delay_production_days;
  const gapVsMaster = detail.development?.avg_gap_vs_master;
  const negotiationProfile = detail.development?.negotiation_profile;
  const hasQualityData = detail.quality !== null;
  const xiamenMix = detail.operations?.xiamen_sales_mix_pct;
  const bsgMix = detail.operations?.bsg_sales_mix_pct;
  const customerSizeBand = detail.operations?.customer_size_band;
  const profitabilityBand = detail.operations?.profitability_band;

  const xiamenDominant = isXiamenDominant(xiamenMix);
  const bsgDominant = isBSGDominant(bsgMix);

  const isLargeAccount =
    customerSizeBand === "GROWTH_ACCOUNT" ||
    customerSizeBand === "LARGE_ACCOUNT" ||
    customerSizeBand === "KEY_ACCOUNT";

  if (xiamenDominant) {
    insights.push({
      title: "Cuenta principalmente Xiamen",
      body: `El mix operativo está dominado por Xiamen (${formatPercent(
        xiamenMix,
        2
      )}). En este tipo de cuenta la lectura debe centrarse más en volumen, continuidad y coordinación que en margen de compraventa.`,
      tone: "neutral",
    });
  }

  if (isLargeAccount) {
    insights.push({
      title: "Cuenta de peso relevante",
      body: `El cliente está clasificado como ${customerSizeBand}. Aunque exista fricción, su peso comercial justifica seguimiento prioritario y lectura estratégica.`,
      tone: "positive",
    });
  }

  if (
    contributionPct !== null &&
    contributionPct !== undefined &&
    contributionPct >= 10
  ) {
    insights.push({
      title: "Peso económico relevante",
      body: `El cliente aporta un contribution_pct de ${formatPercent(
        contributionPct,
        2
      )}. No conviene interpretar la relación solo por fricción: también hay impacto real en negocio.`,
      tone: "positive",
    });
  }

  if (
    productionDelay !== null &&
    productionDelay !== undefined &&
    productionDelay > 0
  ) {
    insights.push({
      title: "Fricción operativa existente",
      body: `La media de retraso de producción es de ${formatNumber(
        productionDelay,
        2
      )} días. Esto apunta a tensión operativa, aunque no necesariamente a un problema estructural de cliente.`,
      tone: productionDelay >= 7 ? "risk" : "warning",
    });
  }

  if (bsgDominant && negotiationProfile === "AGGRESSIVE") {
    insights.push({
      title: "Presión comercial sobre negocio BSG",
      body: `La cuenta tiene peso relevante en BSG (${formatPercent(
        bsgMix,
        2
      )}) y además muestra un perfil negociador agresivo. Aquí sí existe mayor riesgo de erosión de margen y conviene controlar concesiones.`,
      tone: "warning",
    });
  }

  if (
    bsgDominant &&
    gapVsMaster !== null &&
    gapVsMaster !== undefined &&
    gapVsMaster >= 20
  ) {
    insights.push({
      title: "Gap alto frente a master",
      body: `El gap medio frente a master está en ${formatPercent(
        gapVsMaster,
        2
      )}. En una cuenta dominada por BSG esto sugiere presión real sobre pricing y margen.`,
      tone: "warning",
    });
  }

  if (
    !xiamenDominant &&
    (profile === "RISKY" ||
      (frictionScore !== null &&
        frictionScore !== undefined &&
        frictionScore >= 40 &&
        businessScore !== null &&
        businessScore !== undefined &&
        businessScore < 0))
  ) {
    insights.push({
      title: "Relación desequilibrada",
      body: "La combinación de score de negocio débil y fricción elevada sugiere una cuenta exigente para la organización. Conviene revisar estrategia comercial y límites de negociación.",
      tone: "risk",
    });
  }

  if (
    xiamenDominant &&
    frictionScore !== null &&
    frictionScore !== undefined &&
    frictionScore >= 40
  ) {
    insights.push({
      title: "Cuenta exigente de alta coordinación",
      body: "La fricción elevada debe leerse aquí como señal de complejidad operativa y comercial, no necesariamente como bajo valor del cliente. Conviene reforzar seguimiento y coordinación.",
      tone: "warning",
    });
  }

  if (profitabilityBand === "HIGH_MARGIN" && bsgDominant) {
    insights.push({
      title: "Rentabilidad sólida en BSG",
      body: "La cuenta aparece en banda de rentabilidad alta dentro de una operativa donde sí existe margen de compraventa. Esto refuerza su valor económico.",
      tone: "positive",
    });
  }

  if (!hasQualityData) {
    insights.push({
      title: "Sin cobertura QC",
      body: "No hay datos de calidad disponibles para este cliente en la view QC. Esto no implica ausencia de riesgo, sino ausencia de señal en ese bloque.",
      tone: "neutral",
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Lectura estable",
      body: "No se detectan señales especialmente críticas en esta versión del detalle. Conviene seguir monitorizando evolución comercial, operativa y de calidad.",
      tone: "neutral",
    });
  }

  return insights.slice(0, 6);
}

export default async function AnalyticsClienteDetailPage({
  params,
}: {
  params: { customer: string };
}) {
  const decodedCustomer = decodeURIComponent(params.customer);

  const supabase = await createClient();
  const detail = await getCustomerDetailBundle(supabase, decodedCustomer);

  if (!detail.business) {
    notFound();
  }

  const xiamenMix = detail.operations?.xiamen_sales_mix_pct;
  const insights = buildExecutiveInsights(detail);

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-3">
        <Link
          href="/analytics/clientes"
          className="inline-flex rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          ← Volver a Clientes
        </Link>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Analytics · Clientes</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {detail.business.customer}
          </h1>
          <ContextualProfileBadge
            profile={detail.business.customer_business_profile}
            xiamenMix={xiamenMix}
          />
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          title={getBusinessCardTitle(xiamenMix)}
          value={formatNumber(detail.business.customer_business_score, 2)}
          helper={getBusinessCardHelper(xiamenMix)}
        />
        <MetricCard
          title={getFrictionCardTitle(xiamenMix)}
          value={formatNumber(detail.business.customer_friction_score, 2)}
          helper={getFrictionCardHelper(xiamenMix)}
        />
        <MetricCard
          title="Profile"
          value={getContextualProfileLabel(
            detail.business.customer_business_profile,
            xiamenMix
          )}
          helper="Clasificación ajustada al contexto operativo"
        />
      </section>

      {isXiamenDominant(xiamenMix) ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          En cuentas dominadas por Xiamen, el KPI principal debe leerse por
          volumen, continuidad y evolución entre temporadas. Los scores de BI de
          cabecera son útiles como señal secundaria, no como juicio final de la
          cuenta.
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DetailSection
          title="Operaciones"
          description="Lectura operativa basada en vw_exec_customer_ranking"
        >
          <DataRow
            label="Contribution Amount"
            value={formatNumber(detail.operations?.contribution_total, 2)}
          />
          <DataRow
            label="Contribution %"
            value={formatPercent(detail.operations?.contribution_pct, 2)}
          />
          <DataRow
            label="Avg Production Delay"
            value={formatNumber(detail.operations?.avg_delay_production_days, 2)}
          />
          <DataRow
            label="Total Orders"
            value={formatNumber(detail.operations?.po_count, 0)}
          />
          <DataRow
            label="Total Qty"
            value={formatNumber(detail.operations?.qty_total, 0)}
          />
          <DataRow
            label="Xiamen Mix %"
            value={formatPercent(detail.operations?.xiamen_sales_mix_pct, 2)}
          />
          <DataRow
            label="BSG Mix %"
            value={formatPercent(detail.operations?.bsg_sales_mix_pct, 2)}
          />
          <DataRow
            label="Customer Size Band"
            value={detail.operations?.customer_size_band ?? "-"}
          />
          <DataRow
            label="Profitability Band"
            value={detail.operations?.profitability_band ?? "-"}
          />
        </DetailSection>

        <DetailSection
          title="Desarrollo"
          description="Lectura comercial basada en vw_dev_customer_negotiation_score"
        >
          <DataRow label="Season" value={detail.development?.season ?? "-"} />
          <DataRow
            label="Quotes"
            value={formatNumber(detail.development?.quote_count, 0)}
          />
          <DataRow
            label="Gap vs Master %"
            value={formatPercent(detail.development?.avg_gap_vs_master, 2)}
          />
          <DataRow
            label="Gap Quote → Order %"
            value={formatPercent(detail.development?.avg_gap_quote_to_order, 2)}
          />
          <DataRow
            label="Avg Revisions"
            value={formatNumber(detail.development?.avg_revisions, 2)}
          />
          <DataRow
            label="Avg Days to Order"
            value={formatNumber(detail.development?.avg_days_to_order, 2)}
          />
          <DataRow
            label="Negotiation Score"
            value={formatNumber(detail.development?.negotiation_score, 2)}
          />
          <DataRow
            label="Negotiation Profile"
            value={
              <NeutralBadge label={detail.development?.negotiation_profile} />
            }
          />
        </DetailSection>

        <DetailSection
          title="Quality"
          description="Lectura de calidad basada en vw_qc_by_customer"
        >
          <DataRow
            label="Inspections"
            value={formatNumber(detail.quality?.inspections_total, 0)}
          />
          <DataRow
            label="Fail Rate"
            value={formatPercent(detail.quality?.fail_rate, 2)}
          />
          <DataRow
            label="Defect Rate"
            value={formatPercent(detail.quality?.defect_rate, 2)}
          />
        </DetailSection>
      </section>

      {detail.xiamenVolumeEvolution.length > 0 ? (
        <DetailSection
          title="Evolución volumen Xiamen"
          description="Comparativa por temporada basada en vw_xiamen_customer_season_volume_evolution"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Season</th>
                  <th className="px-4 py-3 font-medium">Previous</th>
                  <th className="px-4 py-3 font-medium text-right">Qty</th>
                  <th className="px-4 py-3 font-medium text-right">Prev Qty</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Qty Growth
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    Sell Growth
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    PO Growth
                  </th>
                  <th className="px-4 py-3 font-medium">Signal</th>
                </tr>
              </thead>

              <tbody>
                {detail.xiamenVolumeEvolution.map((row) => (
                  <tr key={`${row.customer}-${row.season}`} className="border-t">
                    <td className="px-4 py-3 font-medium">{row.season}</td>
                    <td className="px-4 py-3">
                      {row.previous_season ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNumber(row.qty_current, 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNumber(row.qty_previous, 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatPercent(row.qty_growth_pct, 2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatPercent(row.sell_growth_pct, 2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatPercent(row.po_count_growth_pct, 2)}
                    </td>
                    <td className="px-4 py-3">
                      <VolumeSignalBadge signal={row.volume_signal} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailSection>
      ) : null}

      <DetailSection
        title="Lectura ejecutiva"
        description="Interpretación automática basada en los bloques ya consolidados"
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {insights.map((insight, index) => (
            <InsightCard
              key={`${insight.title}-${index}`}
              title={insight.title}
              body={insight.body}
              tone={insight.tone}
            />
          ))}
        </div>
      </DetailSection>
    </div>
  );
}