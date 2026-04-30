import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  getCustomerDetailBundle,
  getCustomerHealthSignal,
} from "@/lib/analytics/clientes";
import type { CustomerBusinessProfile } from "@/types/clientes";

type HealthSignal =
  | "HEALTHY"
  | "MONITOR"
  | "WARNING"
  | "CRITICAL"
  | "STABLE"
  | "NEUTRAL"
  | "-";

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

function getProfileLabel(
  profile: string | null | undefined,
  isXiamenContext: boolean
) {
  if (profile === "RISKY" && isXiamenContext) {
    return "DEMANDING (Xiamen)";
  }

  switch (profile) {
    case "CRITICAL_XIAMEN":
      return "CRITICAL (Xiamen)";
    case "WATCH_XIAMEN":
      return "WATCH (Xiamen)";
    case "GROWING_XIAMEN":
      return "GROWING (Xiamen)";
    case "NEW_OR_UNTRACKED_XIAMEN":
      return "NEW / UNTRACKED (Xiamen)";
    case "DEMANDING_XIAMEN":
      return "DEMANDING (Xiamen)";
    default:
      return profile ?? "-";
  }
}

function getProfileBadgeClass(
  profile: string | null | undefined,
  isXiamenContext: boolean
) {
  if (profile === "RISKY" && isXiamenContext) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  switch (profile) {
    case "STRATEGIC":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "PROFITABLE":
    case "GROWING_XIAMEN":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "NEGOTIATOR":
    case "WATCH_XIAMEN":
    case "DEMANDING_XIAMEN":
    case "NEW_OR_UNTRACKED_XIAMEN":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "RISKY":
    case "CRITICAL_XIAMEN":
      return "bg-red-50 text-red-700 ring-red-200";
    case "LOW_VALUE":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

function getHealthBadgeClass(health: HealthSignal) {
  switch (health) {
    case "HEALTHY":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "MONITOR":
    case "STABLE":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "WARNING":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "CRITICAL":
      return "bg-red-50 text-red-700 ring-red-200";
    case "NEUTRAL":
    case "-":
    default:
      return "bg-muted text-muted-foreground ring-border";
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

function getDiagnosisTitle(health: HealthSignal) {
  switch (health) {
    case "CRITICAL":
      return "Riesgo prioritario";
    case "WARNING":
      return "Seguimiento recomendado";
    case "MONITOR":
    case "STABLE":
      return "Vigilancia activa";
    case "HEALTHY":
      return "Cliente en buena situación";
    case "NEUTRAL":
    case "-":
    default:
      return "Sin señal crítica";
  }
}

function getDiagnosisAction(health: HealthSignal, isXiamenContext: boolean) {
  switch (health) {
    case "CRITICAL":
      return isXiamenContext
        ? "Revisar forecast, pipeline y continuidad de volumen con el equipo comercial."
        : "Revisar causas de fricción, rentabilidad y riesgo operativo.";
    case "WARNING":
      return isXiamenContext
        ? "Monitorizar evolución de volumen en la siguiente temporada."
        : "Validar si la fricción operativa requiere seguimiento comercial.";
    case "MONITOR":
    case "STABLE":
      return "Mantener seguimiento y revisar evolución en próximos cierres.";
    case "HEALTHY":
      return "Explorar oportunidades de crecimiento y continuidad.";
    case "NEUTRAL":
    case "-":
    default:
      return "Sin acción urgente. Mantener lectura periódica.";
  }
}

function ProfileBadge({
  profile,
  isXiamenContext,
}: {
  profile: CustomerBusinessProfile | string | null;
  isXiamenContext: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getProfileBadgeClass(
        profile,
        isXiamenContext
      )}`}
    >
      {getProfileLabel(profile, isXiamenContext)}
    </span>
  );
}

function HealthBadge({ health }: { health: HealthSignal }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getHealthBadgeClass(
        health
      )}`}
    >
      {health}
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
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {helper}
        </p>
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
      <div className="text-right text-sm font-medium">{value}</div>
    </div>
  );
}

export default async function AnalyticsClienteDetailPage({
  params,
}: {
  params: { customer: string };
}) {
  const decodedCustomer = decodeURIComponent(params.customer);

  const supabase = await createClient();

  const [detail, healthData] = await Promise.all([
    getCustomerDetailBundle(supabase, decodedCustomer),
    getCustomerHealthSignal(supabase, decodedCustomer),
  ]);

  if (!detail.business) {
    notFound();
  }

  const isXiamenContext = healthData?.xiamen_context_flag === true;
  const health = (healthData?.health_signal as HealthSignal | undefined) ?? "-";

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/analytics/clientes"
            className="inline-flex rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            ← Volver a Clientes
          </Link>

          <Link
            href={`/analytics/operaciones/customers?customer=${encodeURIComponent(
              decodedCustomer
            )}`}
            className="inline-flex rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Operaciones
          </Link>

          <Link
            href={`/analytics/desarrollo/customers?customer=${encodeURIComponent(
              decodedCustomer
            )}`}
            className="inline-flex rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Desarrollo
          </Link>

          <Link
            href={`/analytics/quality/customers?customer=${encodeURIComponent(
              decodedCustomer
            )}`}
            className="inline-flex rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Quality
          </Link>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Analytics · Clientes</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {detail.business.customer}
          </h1>

          <ProfileBadge
            profile={detail.business.customer_business_profile}
            isXiamenContext={isXiamenContext}
          />
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard
          title={isXiamenContext ? "Business Score (BI)" : "Business Score"}
          value={formatNumber(detail.business.customer_business_score, 2)}
          helper={
            isXiamenContext
              ? "Indicador BI secundario en cuentas Xiamen"
              : "Score consolidado de negocio"
          }
        />

        <MetricCard
          title={isXiamenContext ? "Coordination Load" : "Friction Score"}
          value={formatNumber(detail.business.customer_friction_score, 2)}
          helper={
            isXiamenContext
              ? "Complejidad de coordinación, no riesgo puro"
              : "Nivel consolidado de fricción"
          }
        />

        <MetricCard
          title="Profile"
          value={getProfileLabel(
            detail.business.customer_business_profile,
            isXiamenContext
          )}
          helper="Clasificación contextualizada"
        />

        <MetricCard
          title="Health"
          value={health}
          helper="Señal consolidada desde BI Layer"
        />
      </section>

      <DetailSection
        title="Customer Diagnosis"
        description="Lectura ejecutiva basada en señales consolidadas de BI."
      >
        <div
          className={`rounded-2xl p-4 ring-1 ring-inset ${getHealthBadgeClass(
            health
          )}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {getDiagnosisTitle(health)}
              </p>
              <p className="mt-2 text-sm leading-6">
                {healthData?.health_reason ??
                  "Sin señal específica disponible."}
              </p>
            </div>

            <HealthBadge health={health} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-white/70 p-3">
              <p className="text-xs text-muted-foreground">Señal volumen</p>
              <div className="mt-2">
                <VolumeSignalBadge signal={healthData?.volume_signal} />
              </div>
            </div>

            <div className="rounded-lg border bg-white/70 p-3">
              <p className="text-xs text-muted-foreground">Qty Growth</p>
              <p className="mt-1 text-sm font-semibold">
                {formatPercent(healthData?.qty_growth_pct, 2)}
              </p>
            </div>

            <div className="rounded-lg border bg-white/70 p-3">
              <p className="text-xs text-muted-foreground">Sell Growth</p>
              <p className="mt-1 text-sm font-semibold">
                {formatPercent(healthData?.sell_growth_pct, 2)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border bg-white/70 p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Acción sugerida
            </p>
            <p className="mt-1 text-sm leading-6">
              {getDiagnosisAction(health, isXiamenContext)}
            </p>
          </div>
        </div>
      </DetailSection>

      {isXiamenContext ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          En cuentas dominadas por Xiamen, el KPI principal debe leerse por
          volumen, continuidad y evolución entre temporadas. Los scores de BI de
          cabecera son útiles como señal secundaria.
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
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Prev Qty</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Qty Growth
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Sell Growth
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
        description="Interpretación consolidada desde vw_customer_health_signal"
      >
        <div
          className={`rounded-2xl p-4 ring-1 ring-inset ${getHealthBadgeClass(
            health
          )}`}
        >
          <p className="text-sm font-semibold">{health}</p>
          <p className="mt-2 text-sm leading-6">
            {healthData?.health_reason ?? "Sin señal específica disponible."}
          </p>
        </div>

        {healthData && healthData.health_signal === "CRITICAL" ? (
          <div className="mt-4 rounded-xl border bg-red-50 p-4 text-sm text-red-900">
            <p className="mb-4 font-semibold">Drivers del estado</p>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="rounded-lg border bg-white p-3">
                <p className="text-xs text-muted-foreground">
                  Última temporada
                </p>
                <p className="text-sm font-semibold">
                  {healthData.xiamen_latest_season ?? "-"}
                </p>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <p className="text-xs text-muted-foreground">
                  Temporada previa
                </p>
                <p className="text-sm font-semibold">
                  {healthData.xiamen_previous_season ?? "-"}
                </p>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <p className="text-xs text-muted-foreground">Qty Growth</p>
                <p className="text-sm font-semibold text-red-600">
                  {formatPercent(healthData.qty_growth_pct, 2)}
                </p>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <p className="text-xs text-muted-foreground">Sell Growth</p>
                <p className="text-sm font-semibold text-red-600">
                  {formatPercent(healthData.sell_growth_pct, 2)}
                </p>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <p className="text-xs text-muted-foreground">PO Growth</p>
                <p className="text-sm font-semibold text-red-600">
                  {formatPercent(healthData.po_count_growth_pct, 2)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </DetailSection>
    </div>
  );
}