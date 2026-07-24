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
  keywords: [string, string, string];
  summary: string;
  icon: LucideIcon;
};

const areas: AnalysisArea[] = [
  {
    key: "operations",
    label: "Operaciones",
    keywords: ["Pedidos", "Producción", "Entregas"],
    summary: "Comprender la situación general del negocio.",
    icon: Boxes,
  },
  {
    key: "commercial",
    label: "Comercial",
    keywords: ["Clientes", "Ventas", "Margen"],
    summary: "Comprender el rendimiento comercial.",
    icon: Briefcase,
  },
  {
    key: "product",
    label: "Producto",
    keywords: ["Modelos", "Categorías", "Variantes"],
    summary: "Comprender el comportamiento del producto.",
    icon: PackageSearch,
  },
  {
    key: "production",
    label: "Producción",
    keywords: ["Pedidos", "Fábricas", "Estados"],
    summary: "Comprender la ejecución de la producción.",
    icon: Factory,
  },
  {
    key: "quality",
    label: "Calidad",
    keywords: ["Inspecciones", "Defectos", "Fábricas"],
    summary: "Comprender el comportamiento de la calidad.",
    icon: ShieldCheck,
  },
  {
    key: "logistics",
    label: "Logística",
    keywords: ["Fechas", "Retrasos", "Entregas"],
    summary: "Comprender el cumplimiento logístico.",
    icon: Truck,
  },
  {
    key: "development",
    label: "Desarrollo",
    keywords: ["Modelos", "Cotizaciones", "Conversión"],
    summary: "Comprender la evolución del desarrollo.",
    icon: FlaskConical,
  },
  {
    key: "all",
    label: "Explorar todo",
    keywords: ["Todas las áreas", "Todas las preguntas", "Sin contexto inicial"],
    summary: "Explorar todo el conocimiento disponible.",
    icon: Globe2,
  },
];

const standardAreas = areas.filter((area) => area.key !== "all");
const allAreasOption = areas.find((area) => area.key === "all");

export default function AnalyticsExplorerPage({
  searchParams,
}: PageProps) {
  const selectedAreaKey = getSelectedArea(searchParams.area);
  const selectedArea = areas.find((area) => area.key === selectedAreaKey);

  return (
    <main className="space-y-6">
      <ExplorerHeader selectedArea={selectedArea} />

      {selectedArea ? (
        <SelectedAreaState area={selectedArea} />
      ) : (
        <NewAnalysisSection />
      )}

      {!selectedArea && <ExistingAnalysesSection />}
    </main>
  );
}

function ExplorerHeader({
  selectedArea,
}: {
  selectedArea: AnalysisArea | undefined;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm md:p-7">
      <div className="max-w-3xl">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
          <BarChart3 className="h-5 w-5" />
        </div>

        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Explorador Analítico
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          ¿Qué quieres comprender hoy?
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">
          Construiremos el análisis paso a paso. Empieza eligiendo desde qué
          área del negocio quieres explorar.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <StepBadge
            step="1"
            label="Elegir área"
            completed={Boolean(selectedArea)}
          />

          <div className="h-px w-8 bg-slate-200" />

          <StepBadge
            step="2"
            label="Elegir pregunta"
            active={Boolean(selectedArea)}
          />

          <div className="h-px w-8 bg-slate-200" />

          <StepBadge step="3" label="Elegir desglose" />
        </div>
      </div>
    </section>
  );
}

function StepBadge({
  step,
  label,
  active = false,
  completed = false,
}: {
  step: string;
  label: string;
  active?: boolean;
  completed?: boolean;
}) {
  const emphasized = active || completed;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
          emphasized
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-200 bg-white text-slate-500"
        }`}
      >
        {completed ? "✓" : step}
      </span>

      <span
        className={`text-sm font-medium ${
          emphasized ? "text-slate-900" : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function NewAnalysisSection() {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Paso 1
        </p>

        <h2 className="mt-1 text-xl font-semibold">
          Elige el punto de partida
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          No estás eligiendo un informe. Estás eligiendo desde qué parte del
          negocio quieres empezar a explorar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {standardAreas.map((area) => (
          <AreaCard key={area.key} area={area} />
        ))}
      </div>

      {allAreasOption && <ExploreAllOption area={allAreasOption} />}
    </section>
  );
}

function AreaCard({ area }: { area: AnalysisArea }) {
  const Icon = area.icon;

  return (
    <Link
      href={`/analytics/explorer?area=${area.key}`}
      className="group flex min-h-52 flex-col rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background text-slate-700">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-5 text-base font-semibold">{area.label}</h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {area.keywords.map((keyword) => (
          <span
            key={keyword}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
          >
            {keyword}
          </span>
        ))}
      </div>

      <p className="mt-4 flex-1 text-sm leading-6 text-muted-foreground">
        {area.summary}
      </p>

      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-900">
        Elegir área
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function ExploreAllOption({ area }: { area: AnalysisArea }) {
  const Icon = area.icon;

  return (
    <div className="rounded-2xl border border-dashed bg-card p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background text-slate-700">
            <Icon className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-semibold">
              ¿Prefieres empezar sin un contexto?
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Explora todas las áreas del negocio sin limitar la pregunta
              inicial.
            </p>
          </div>
        </div>

        <Link
          href={`/analytics/explorer?area=${area.key}`}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-semibold transition hover:bg-slate-50"
        >
          Explorar todo
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
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
              Área seleccionada
            </p>

            <h2 className="mt-1 text-2xl font-semibold">{area.label}</h2>

            <div className="mt-3 flex flex-wrap gap-2">
              {area.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {keyword}
                </span>
              ))}
            </div>
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
          Paso 2
        </p>

        <h3 className="mt-2 text-lg font-semibold">
          ¿Qué quieres analizar?
        </h3>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Ya tenemos el punto de partida. El siguiente incremento incorporará
          las preguntas de negocio disponibles para esta área.
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
              Sin análisis recientes.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          Tus últimos análisis aparecerán aquí.
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
              Sin análisis guardados.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          Tus análisis guardados aparecerán aquí.
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