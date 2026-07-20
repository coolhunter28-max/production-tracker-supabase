import type { ExecutiveSummary } from "@/lib/analytics/executive-v2/summary";

type Props = {
  summary: ExecutiveSummary;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES").format(value);
}

export default function ExecutiveSummary({ summary }: Props) {
  return (
    <div className="space-y-8">

      <section>
        <h1 className="text-3xl font-bold">
          Executive
        </h1>

        {summary.context.season && (
          <p className="text-muted-foreground mt-2">
            Temporada {summary.context.season}
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">

        <div className="rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            Ventas
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {formatCurrency(summary.business.salesAmount)}
          </p>
        </div>

        <div className="rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            Contribución
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {formatCurrency(summary.business.contributionAmount)}
          </p>

          {summary.business.contributionPercent !== null && (
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.business.contributionPercent.toFixed(2)} %
            </p>
          )}
        </div>

        <div className="rounded-xl border p-6">

          <p className="text-sm text-muted-foreground">
            Mix de negocio
          </p>

          <div className="mt-4 space-y-2">

            <div className="flex justify-between">
              <span>BSG</span>

              <span>
                {summary.operations.bsg.salesMixPercent ?? 0} %
              </span>
            </div>

            <div className="flex justify-between">
              <span>Xiamen DIC</span>

              <span>
                {summary.operations.xiamenDic.salesMixPercent ?? 0} %
              </span>
            </div>

          </div>

        </div>

      </section>

      <section className="grid gap-4 md:grid-cols-3">

        <div className="rounded-xl border p-6">

          <p className="text-sm text-muted-foreground">
            Clientes activos
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {formatNumber(summary.activity.customerCount)}
          </p>

        </div>

        <div className="rounded-xl border p-6">

          <p className="text-sm text-muted-foreground">
            Pedidos
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {formatNumber(summary.activity.poCount)}
          </p>

        </div>

        <div className="rounded-xl border p-6">

          <p className="text-sm text-muted-foreground">
            Modelos
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {formatNumber(summary.activity.modelCount)}
          </p>

        </div>

      </section>

    </div>
  );
}