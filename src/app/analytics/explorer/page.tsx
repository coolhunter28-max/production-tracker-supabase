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

type ConceptKey =
  | "sales"
  | "margin"
  | "customers"
  | "seasons"
  | "markets"
  | "commercial-activity";

type PerspectiveKey =
  | "customer"
  | "factory"
  | "season"
  | "operativa";

type AnalysisArea = {
  key: AreaKey;
  label: string;
  keywords: [string, string, string];
  summary: string;
  icon: LucideIcon;
};

type AnalyticalConcept = {
  key: ConceptKey;
  label: string;
  description: string;
  context?: string;
};

type AnalyticalPerspective = {
  key: PerspectiveKey;
  label: string;
  description: string;
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
    keywords: ["Todas las áreas", "Todos los conceptos", "Sin contexto inicial"],
    summary: "Explorar todo el conocimiento disponible.",
    icon: Globe2,
  },
];

const commercialConcepts: AnalyticalConcept[] = [
  {
    key: "sales",
    label: "Ventas",
    description:
      "Comprende el volumen económico generado por la actividad comercial.",
  },
  {
    key: "margin",
    label: "Margen",
    description:
      "Comprende el resultado económico obtenido dentro de la actividad comercial.",
    context:
      "El margen debe interpretarse junto con el volumen económico, la evolución temporal y el modelo operativo.",
  },
  {
    key: "customers",
    label: "Clientes",
    description:
      "Comprende cómo se distribuye y evoluciona la actividad entre los clientes.",
  },
  {
    key: "seasons",
    label: "Temporadas",
    description:
      "Comprende cómo cambia el comportamiento comercial entre campañas y temporadas.",
  },
  {
    key: "markets",
    label: "Mercados",
    description:
      "Comprende cómo se distribuye y evoluciona la actividad entre mercados.",
  },
  {
    key: "commercial-activity",
    label: "Actividad comercial",
    description:
      "Comprende la evolución general de la actividad comercial del negocio.",
  },
];

const marginPerspectives: AnalyticalPerspective[] = [
  {
    key: "customer",
    label: "Cliente",
    description:
      "Compara cómo se distribuye el margen entre los distintos clientes.",
  },
  {
    key: "factory",
    label: "Fábrica",
    description:
      "Compara cómo se distribuye el margen entre las distintas fábricas.",
  },
  {
    key: "season",
    label: "Temporada",
    description:
      "Observa cómo cambia el margen entre campañas y temporadas.",
  },
  {
    key: "operativa",
    label: "Operativa",
    description:
      "Compara el margen según el modelo operativo utilizado.",
  },
];

const standardAreas = areas.filter((area) => area.key !== "all");
const allAreasOption = areas.find((area) => area.key === "all");

export default function AnalyticsExplorerPage({
  searchParams,
}: PageProps) {
  const selectedAreaKey = getSelectedArea(searchParams.area);

  const selectedArea = areas.find(
    (area) => area.key === selectedAreaKey,
  );

  const selectedConceptKey = getSelectedConcept(
    selectedAreaKey,
    searchParams.concept,
  );

  const selectedConcept = commercialConcepts.find(
    (concept) => concept.key === selectedConceptKey,
  );

  const selectedPerspectiveKey = getSelectedPerspective(
    selectedAreaKey,
    selectedConceptKey,
    searchParams.perspective,
  );

  const selectedPerspective = marginPerspectives.find(
    (perspective) => perspective.key === selectedPerspectiveKey,
  );

  return (
    <main className="space-y-6">
      <ExplorerHeader
        selectedArea={selectedArea}
        selectedConcept={selectedConcept}
        selectedPerspective={selectedPerspective}
      />

      {selectedArea ? (
        <SelectedAreaState
          area={selectedArea}
          selectedConcept={selectedConcept}
          selectedPerspective={selectedPerspective}
        />
      ) : (
        <NewAnalysisSection />
      )}

      {!selectedArea && <ExistingAnalysesSection />}
    </main>
  );
}

function ExplorerHeader({
  selectedArea,
  selectedConcept,
  selectedPerspective,
}: {
  selectedArea: AnalysisArea | undefined;
  selectedConcept: AnalyticalConcept | undefined;
  selectedPerspective: AnalyticalPerspective | undefined;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm md:p-7">
      <div className="max-w-4xl">
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
          Construiremos el análisis paso a paso. En cada momento solo tendrás
          que tomar una decisión.
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
            label="Elegir concepto"
            active={Boolean(selectedArea) && !selectedConcept}
            completed={Boolean(selectedConcept)}
          />

          <div className="h-px w-8 bg-slate-200" />

          <StepBadge
            step="3"
            label="Elegir perspectiva"
            active={Boolean(selectedConcept) && !selectedPerspective}
            completed={Boolean(selectedPerspective)}
          />
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
              Explora todas las áreas del negocio sin limitar el concepto
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

function SelectedAreaState({
  area,
  selectedConcept,
  selectedPerspective,
}: {
  area: AnalysisArea;
  selectedConcept: AnalyticalConcept | undefined;
  selectedPerspective: AnalyticalPerspective | undefined;
}) {
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

      {area.key === "commercial" ? (
        selectedConcept ? (
          <SelectedConceptState
            area={area}
            concept={selectedConcept}
            selectedPerspective={selectedPerspective}
          />
        ) : (
          <CommercialConceptSelector />
        )
      ) : (
        <PendingAreaState area={area} />
      )}

      <AnalysisSummary
        area={area}
        selectedConcept={selectedConcept}
        selectedPerspective={selectedPerspective}
      />
    </section>
  );
}

function CommercialConceptSelector() {
  return (
    <div className="mt-7">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Paso 2
        </p>

        <h3 className="mt-1 text-xl font-semibold">
          ¿Qué quieres analizar?
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          Elige el concepto que necesitas comprender.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {commercialConcepts.map((concept) => (
          <Link
            key={concept.key}
            href={`/analytics/explorer?area=commercial&concept=${concept.key}`}
            className="group flex min-h-40 flex-col rounded-xl border bg-background p-5 transition hover:border-slate-400 hover:shadow-sm"
          >
            <h4 className="text-lg font-semibold">{concept.label}</h4>

            <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
              {concept.description}
            </p>

            <div className="mt-5 flex items-center gap-2 text-sm font-semibold">
              Elegir concepto
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SelectedConceptState({
  area,
  concept,
  selectedPerspective,
}: {
  area: AnalysisArea;
  concept: AnalyticalConcept;
  selectedPerspective: AnalyticalPerspective | undefined;
}) {
  return (
    <div className="mt-7 space-y-4">
      <div className="rounded-xl border bg-background p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Concepto seleccionado
            </p>

            <h3 className="mt-2 text-2xl font-semibold">{concept.label}</h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {concept.description}
            </p>
          </div>

          <Link
            href={`/analytics/explorer?area=${area.key}`}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border bg-white px-4 text-sm font-medium transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Cambiar concepto
          </Link>
        </div>

        {concept.context && (
          <div className="mt-5 rounded-lg border-l-4 border-slate-900 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Contexto necesario
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-700">
              {concept.context}
            </p>
          </div>
        )}
      </div>

      {concept.key === "margin" ? (
        selectedPerspective ? (
          <SelectedPerspectiveState
            area={area}
            concept={concept}
            perspective={selectedPerspective}
          />
        ) : (
          <MarginPerspectiveSelector />
        )
      ) : (
        <PendingConceptPerspectives concept={concept} />
      )}
    </div>
  );
}

function MarginPerspectiveSelector() {
  return (
    <div className="rounded-xl border border-dashed bg-background p-5 md:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Paso 3
      </p>

      <h3 className="mt-2 text-xl font-semibold">
        ¿Desde qué perspectiva quieres observarlo?
      </h3>

      <p className="mt-1 text-sm text-muted-foreground">
        Elige cómo quieres desglosar el margen.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {marginPerspectives.map((perspective) => (
          <Link
            key={perspective.key}
            href={`/analytics/explorer?area=commercial&concept=margin&perspective=${perspective.key}`}
            className="group flex min-h-40 flex-col rounded-xl border bg-white p-5 transition hover:border-slate-400 hover:shadow-sm"
          >
            <h4 className="text-lg font-semibold">
              {perspective.label}
            </h4>

            <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
              {perspective.description}
            </p>

            <div className="mt-5 flex items-center gap-2 text-sm font-semibold">
              Elegir perspectiva
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SelectedPerspectiveState({
  area,
  concept,
  perspective,
}: {
  area: AnalysisArea;
  concept: AnalyticalConcept;
  perspective: AnalyticalPerspective;
}) {
  return (
    <div className="rounded-xl border bg-background p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Perspectiva seleccionada
          </p>

          <h3 className="mt-2 text-xl font-semibold">
            {concept.label} por {perspective.label}
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {perspective.description}
          </p>
        </div>

        <Link
          href={`/analytics/explorer?area=${area.key}&concept=${concept.key}`}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border bg-white px-4 text-sm font-medium transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Cambiar perspectiva
        </Link>
      </div>

      <div className="mt-5 rounded-lg border border-dashed bg-slate-50 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Análisis preparado
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-700">
          Ya está definida la pregunta analítica: {concept.label} por{" "}
          {perspective.label}. El siguiente incremento conectará esta selección
          con la capa de datos.
        </p>
      </div>
    </div>
  );
}

function PendingConceptPerspectives({
  concept,
}: {
  concept: AnalyticalConcept;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-background p-5 md:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Paso 3
      </p>

      <h3 className="mt-2 text-lg font-semibold">
        Perspectivas de {concept.label}
      </h3>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        En este sprint estamos validando las perspectivas del concepto Margen.
        Las perspectivas de este concepto se incorporarán después de confirmar
        el patrón.
      </p>
    </div>
  );
}

function PendingAreaState({ area }: { area: AnalysisArea }) {
  return (
    <div className="mt-7 rounded-xl border border-dashed bg-background p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Paso 2
      </p>

      <h3 className="mt-2 text-lg font-semibold">
        Conceptos de {area.label}
      </h3>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        En este sprint estamos validando el modelo de interacción con el área
        Comercial. Los conceptos de esta área se incorporarán después de
        confirmar el patrón.
      </p>
    </div>
  );
}

function AnalysisSummary({
  area,
  selectedConcept,
  selectedPerspective,
}: {
  area: AnalysisArea;
  selectedConcept: AnalyticalConcept | undefined;
  selectedPerspective: AnalyticalPerspective | undefined;
}) {
  return (
    <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <AnalysisState label="Área" value={area.label} />

      <AnalysisState
        label="Concepto"
        value={selectedConcept?.label ?? "Sin definir"}
      />

      <AnalysisState
        label="Perspectiva"
        value={selectedPerspective?.label ?? "Sin definir"}
      />

      <AnalysisState label="Representación" value="Automática" />
    </dl>
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

      <dd className="mt-1 text-sm font-semibold leading-5">{value}</dd>
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

function getSelectedConcept(
  area: AreaKey | undefined,
  value: string | string[] | undefined,
): ConceptKey | undefined {
  if (area !== "commercial") {
    return undefined;
  }

  const normalizedValue = Array.isArray(value) ? value[0] : value;

  return commercialConcepts.some(
    (concept) => concept.key === normalizedValue,
  )
    ? (normalizedValue as ConceptKey)
    : undefined;
}

function getSelectedPerspective(
  area: AreaKey | undefined,
  concept: ConceptKey | undefined,
  value: string | string[] | undefined,
): PerspectiveKey | undefined {
  if (area !== "commercial" || concept !== "margin") {
    return undefined;
  }

  const normalizedValue = Array.isArray(value) ? value[0] : value;

  return marginPerspectives.some(
    (perspective) => perspective.key === normalizedValue,
  )
    ? (normalizedValue as PerspectiveKey)
    : undefined;
}