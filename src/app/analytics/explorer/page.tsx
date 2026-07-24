import Link from "next/link";
import {
    ArrowRight,
    BarChart3,
    Boxes,
    Briefcase,
    Factory,
    FlaskConical,
    FolderOpen,
    Globe2,
    PackageSearch,
    RotateCcw,
    ShieldCheck,
    Truck,
    type LucideIcon,
  } from "lucide-react";

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

type AreaKey =
  | "operations"
  | "commercial"
  | "product"
  | "production"
  | "quality"
  | "logistics"
  | "development"
  | "all";

type AnalysisArea = {
  key: AreaKey;
  label: string;
  description: string;
  icon: LucideIcon;
};

const areas: AnalysisArea[] = [
  {
    key: "operations",
    label: "Operaciones",
    description:
      "Comprende la situación general de pedidos, producción y entregas.",
    icon: Boxes,
  },
  {
    key: "commercial",
    label: "Comercial",
    description:
      "Analiza ventas, clientes, temporadas y comportamiento comercial.",
      icon: Briefcase,
  },
  {
    key: "product",
    label: "Producto",
    description:
      "Explora modelos, categorías, variantes y comportamiento del producto.",
    icon: PackageSearch,
  },
  {
    key: "production",
    label: "Producción",
    description:
      "Estudia cantidades, fábricas, estados y evolución de la producción.",
    icon: Factory,
  },
  {
    key: "quality",
    label: "Calidad",
    description:
      "Investiga inspecciones, defectos, clientes, modelos y fábricas.",
    icon: ShieldCheck,
  },
  {
    key: "logistics",
    label: "Logística",
    description:
      "Analiza fechas, retrasos, entregas y cumplimiento logístico.",
    icon: Truck,
  },
  {
    key: "development",
    label: "Desarrollo",
    description:
      "Comprende modelos, cotizaciones y conversión hacia producción.",
    icon: FlaskConical,
  },
  {
    key: "all",
    label: "Explorar todo",
    description:
      "Empieza sin limitar el análisis a un área concreta del negocio.",
    icon: Globe2,
  },
];

export default function AnalyticsExplorerPage({
  searchParams,
}: PageProps) {
  const selectedAreaKey = getSelectedArea(searchParams.area);
  const selectedArea = areas.find((area) => area.key === selectedAreaKey);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border bg-card p-5 shadow-sm md:p-7">
        <div className="max-w-3xl">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>

          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Explorador Analítico
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            ¿Qué quieres comprender?
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">
            Empieza por un área del negocio. Después construiremos la pregunta
            paso a paso, sin necesidad de preparar previamente un informe.
          </p>
        </div>
      </section>

      {selectedArea ? (
        <SelectedAreaState area={selectedArea} />
      ) : (
        <NewAnalysisSection />
      )}

      <ExistingAnalysesSection />
    </main>
  );
}

function NewAnalysisSection() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Nuevo análisis</h2>
        <p className="text-sm text-muted-foreground">
          Selecciona el contexto inicial de tu pregunta.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {areas.map((area) => {
          const Icon = area.icon;

          return (
            <Link
              key={area.key}
              href={`/analytics/explorer?area=${area.key}`}
              className="group flex min-h-48 flex-col rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background text-slate-700">
                <Icon className="h-5 w-5" />
              </div>

              <h3 className="mt-5 font-semibold">{area.label}</h3>

              <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                {area.description}
              </p>

              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-900">
                Empezar
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function SelectedAreaState({ area }: { area: AnalysisArea }) {
  const Icon = area.icon;

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm md:p-7">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-3xl gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Icon className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Análisis nuevo
            </p>

            <h2 className="mt-1 text-2xl font-semibold">{area.label}</h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {area.description}
            </p>
          </div>
        </div>

        <Link
          href="/analytics/explorer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Cambiar área
        </Link>
      </div>

      <div className="mt-7 rounded-xl border border-dashed bg-background p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Siguiente paso
        </p>

        <h3 className="mt-2 text-lg font-semibold">
          ¿Qué quieres analizar?
        </h3>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          El área ya está definida. En el siguiente incremento incorporaremos
          las primeras preguntas de negocio compatibles con este contexto.
        </p>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AnalysisState label="Área" value={area.label} />
        <AnalysisState label="Pregunta" value="Sin definir" />
        <AnalysisState label="Desglose" value="Sin definir" />
        <AnalysisState label="Representación" value="Automática" />
      </dl>
    </section>
  );
}

function AnalysisState({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}

function ExistingAnalysesSection() {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background">
            <RotateCcw className="h-4 w-4" />
          </div>

          <div>
            <h2 className="font-semibold">Continuar análisis reciente</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Todavía no hay análisis recientes.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          Los análisis utilizados recientemente aparecerán aquí.
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background">
            <FolderOpen className="h-4 w-4" />
          </div>

          <div>
            <h2 className="font-semibold">Abrir análisis guardado</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Todavía no hay análisis guardados.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          Los análisis personales y compartidos aparecerán aquí.
        </div>
      </div>
    </section>
  );
}

function getSelectedArea(
  value: string | string[] | undefined,
): AreaKey | undefined {
  const normalizedValue = Array.isArray(value) ? value[0] : value;

  return areas.some((area) => area.key === normalizedValue)
    ? (normalizedValue as AreaKey)
    : undefined;
}