import Link from "next/link";
import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { ExplorerSummaryCard } from "@/components/analytics/explorer/ExplorerSummaryCard";
import { AnalyticsRankingTable } from "@/components/analytics/tables/AnalyticsRankingTable";
import {
  getCommercialSeasons,
  resolveAnalysisContext,
  type AnalysisContext,
  type CommercialSeasonOption,
} from "@/lib/analytics/context/analysis-context";
import { getExplorerBsgMarginByCustomer } from "@/lib/analytics/explorer/bsg-margin";
import { getExplorerContributionByCustomer } from "@/lib/analytics/explorer/contribution";
import { getExplorerProfitabilityByCustomer } from "@/lib/analytics/explorer/profitability";
import { getExplorerPurchasesByCustomer } from "@/lib/analytics/explorer/purchases";
import { getExplorerSalesByCustomer } from "@/lib/analytics/explorer/sales";
import { getExplorerXiamenCommissionByCustomer } from "@/lib/analytics/explorer/xiamen-commission";
import type { ExplorerSummary } from "@/lib/analytics/explorer/types";
import type { CustomerKpiSummary } from "@/lib/analytics/summary/customer-kpi-summary";
import { buildBsgMarginSummary } from "@/lib/analytics/summary/bsg-margin-summary-adapter";
import { buildSalesSummary } from "@/lib/analytics/summary/sales-summary-adapter";
import {
  EXPLORER_CONCEPTS,
  type ExplorerConcept,
  type ExplorerConceptId,
} from "@/lib/analytics/explorer/catalog";
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

type ConceptKey = ExplorerConceptId;

type PerspectiveKey =
  | "customer"
  | "factory"
  | "season"
  | "operativa";

type ContextKey =
  | "active"
  | "single"
  | "comparative"
  | "historical";

type AnalysisArea = {
  key: AreaKey;
  label: string;
  keywords: [string, string, string];
  summary: string;
  icon: LucideIcon;
};

type AnalyticalPerspective = {
  key: PerspectiveKey;
  label: string;
  description: string;
};

type ExplorerCustomerMetricRow = {
  ranking: number;
  customer: string;
  current_value: number;
  current_percentage: number | null;
  comparison_value: number | null;
  comparison_percentage: number | null;
  delta_value: number | null;
  delta_pct: number | null;
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

const commercialPerspectives: AnalyticalPerspective[] = [
  {
    key: "customer",
    label: "Cliente",
    description:
      "Compara cómo se distribuye el concepto entre los distintos clientes.",
  },
  {
    key: "factory",
    label: "Fábrica",
    description:
      "Compara cómo se distribuye el concepto entre las distintas fábricas.",
  },
  {
    key: "season",
    label: "Temporada",
    description:
      "Observa cómo cambia el concepto entre campañas y temporadas.",
  },
  {
    key: "operativa",
    label: "Operativa",
    description:
      "Compara el concepto según el modelo operativo utilizado.",
  },
];

const standardAreas = areas.filter((area) => area.key !== "all");
const allAreasOption = areas.find((area) => area.key === "all");

export default async function AnalyticsExplorerPage({
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

  const selectedConcept = EXPLORER_CONCEPTS.find(
    (concept) => concept.id === selectedConceptKey,
  );

  const selectedPerspectiveKey = getSelectedPerspective(
    selectedAreaKey,
    selectedConceptKey,
    searchParams.perspective,
  );

  const selectedPerspective = commercialPerspectives.find(
    (perspective) => perspective.key === selectedPerspectiveKey,
  );

  const selectedContextKey = getSelectedContext(
    selectedPerspectiveKey,
    searchParams.context,
  );

  const selectedSeason = getSearchParam(searchParams.season);
  const requestedCustomer = getSearchParam(searchParams.customer);

  const commercialSeasons = selectedPerspective
    ? await getCommercialSeasons()
    : [];

  const analysisContext = await resolveSelectedAnalysisContext(
    selectedContextKey,
    selectedSeason,
  );

  const customerMetricResult =
    selectedConceptKey &&
    selectedPerspectiveKey === "customer" &&
    analysisContext
      ? await getExplorerCustomerMetricRows(
          selectedConceptKey,
          analysisContext,
        )
      : undefined;

  const selectedCustomer =
    requestedCustomer &&
    customerMetricResult?.some(
      (row) => row.customer === requestedCustomer,
    )
      ? requestedCustomer
      : undefined;

  const displayedCustomerMetricRows = selectedCustomer
    ? customerMetricResult?.filter(
        (row) => row.customer === selectedCustomer,
      )
    : customerMetricResult;

  const customerMetricSummary =
    selectedConceptKey &&
    analysisContext &&
    customerMetricResult
      ? selectedCustomer
        ? buildSelectedCustomerSummary(
            selectedConceptKey,
            analysisContext,
            customerMetricResult,
            selectedCustomer,
          )
        : await buildExplorerSummary(
            selectedConceptKey,
            analysisContext,
            customerMetricResult,
          )
      : undefined;

  return (
    <main className="space-y-6">
      <ExplorerHeader
        selectedArea={selectedArea}
        selectedConcept={selectedConcept}
        selectedPerspective={selectedPerspective}
        analysisContext={analysisContext}
      />

      {selectedArea ? (
        <SelectedAreaState
          area={selectedArea}
          selectedConcept={selectedConcept}
          selectedPerspective={selectedPerspective}
          selectedContextKey={selectedContextKey}
          selectedSeason={selectedSeason}
          commercialSeasons={commercialSeasons}
          analysisContext={analysisContext}
        />
      ) : (
        <NewAnalysisSection />
      )}

      {analysisContext &&
      selectedAreaKey &&
      selectedConceptKey &&
      selectedConcept &&
      selectedPerspectiveKey === "customer" &&
      selectedContextKey &&
      customerMetricResult &&
      displayedCustomerMetricRows &&
      customerMetricSummary ? (
        <CustomerMetricResult
          concept={selectedConcept}
          context={analysisContext}
          rows={displayedCustomerMetricRows}
          allRows={customerMetricResult}
          summary={customerMetricSummary}
          selectedCustomer={selectedCustomer}
          selectedAreaKey={selectedAreaKey}
          selectedConceptKey={selectedConceptKey}
          selectedPerspectiveKey={selectedPerspectiveKey}
          selectedContextKey={selectedContextKey}
          selectedSeason={selectedSeason}
        />
      ) : null}

      {!selectedArea && <ExistingAnalysesSection />}
    </main>
  );
}

function ExplorerHeader({
  selectedArea,
  selectedConcept,
  selectedPerspective,
  analysisContext,
}: {
  selectedArea: AnalysisArea | undefined;
  selectedConcept: ExplorerConcept | undefined;
  selectedPerspective: AnalyticalPerspective | undefined;
  analysisContext: AnalysisContext | undefined;
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

          <div className="h-px w-8 bg-slate-200" />

          <StepBadge
            step="4"
            label="Elegir contexto"
            active={Boolean(selectedPerspective) && !analysisContext}
            completed={Boolean(analysisContext)}
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
  selectedContextKey,
  selectedSeason,
  commercialSeasons,
  analysisContext,
}: {
  area: AnalysisArea;
  selectedConcept: ExplorerConcept | undefined;
  selectedPerspective: AnalyticalPerspective | undefined;
  selectedContextKey: ContextKey | undefined;
  selectedSeason: string | undefined;
  commercialSeasons: CommercialSeasonOption[];
  analysisContext: AnalysisContext | undefined;
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
            selectedContextKey={selectedContextKey}
            selectedSeason={selectedSeason}
            commercialSeasons={commercialSeasons}
            analysisContext={analysisContext}
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
        analysisContext={analysisContext}
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
        {EXPLORER_CONCEPTS.map((concept) => (
          <Link
            key={concept.id}
            href={`/analytics/explorer?area=commercial&concept=${concept.id}`}
            className="group flex min-h-40 flex-col rounded-xl border bg-background p-5 transition hover:border-slate-400 hover:shadow-sm"
          >
            <h4 className="text-lg font-semibold">{concept.label}</h4>

            <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
              {concept.shortDescription}
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
  selectedContextKey,
  selectedSeason,
  commercialSeasons,
  analysisContext,
}: {
  area: AnalysisArea;
  concept: ExplorerConcept;
  selectedPerspective: AnalyticalPerspective | undefined;
  selectedContextKey: ContextKey | undefined;
  selectedSeason: string | undefined;
  commercialSeasons: CommercialSeasonOption[];
  analysisContext: AnalysisContext | undefined;
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
              {concept.shortDescription}
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

        {concept.caution && (
          <div className="mt-5 rounded-lg border-l-4 border-slate-900 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Contexto necesario
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-700">
              {concept.caution}
            </p>
          </div>
        )}
      </div>

      {concept.id === "bsg-margin" ||
      concept.id === "contribution" ||
      concept.id === "sales" ||
      concept.id === "purchases" ||
      concept.id === "xiamen-commission" ||
      concept.id === "profitability" ? (
        selectedPerspective ? (
          <SelectedPerspectiveState
            area={area}
            concept={concept}
            perspective={selectedPerspective}
            selectedContextKey={selectedContextKey}
            selectedSeason={selectedSeason}
            commercialSeasons={commercialSeasons}
            analysisContext={analysisContext}
          />
        ) : (
          <CommercialPerspectiveSelector concept={concept} />
        )
      ) : (
        <PendingConceptPerspectives concept={concept} />
      )}
    </div>
  );
}

function CommercialPerspectiveSelector({
  concept,
}: {
  concept: ExplorerConcept;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-background p-5 md:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Paso 3
      </p>

      <h3 className="mt-2 text-xl font-semibold">
        ¿Desde qué perspectiva quieres observarlo?
      </h3>

      <p className="mt-1 text-sm text-muted-foreground">
        Elige cómo quieres desglosar {concept.label.toLowerCase()}.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {commercialPerspectives.map((perspective) => (
          <Link
            key={perspective.key}
            href={`/analytics/explorer?area=commercial&concept=${concept.id}&perspective=${perspective.key}`}
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
  selectedContextKey,
  selectedSeason,
  commercialSeasons,
  analysisContext,
}: {
  area: AnalysisArea;
  concept: ExplorerConcept;
  perspective: AnalyticalPerspective;
  selectedContextKey: ContextKey | undefined;
  selectedSeason: string | undefined;
  commercialSeasons: CommercialSeasonOption[];
  analysisContext: AnalysisContext | undefined;
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
          href={`/analytics/explorer?area=${area.key}&concept=${concept.id}`}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border bg-white px-4 text-sm font-medium transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Cambiar perspectiva
        </Link>
      </div>

      <AnalysisContextSelector
        concept={concept}
        perspective={perspective}
        selectedContextKey={selectedContextKey}
        selectedSeason={selectedSeason}
        commercialSeasons={commercialSeasons}
        analysisContext={analysisContext}
      />
    </div>
  );
}

function PendingConceptPerspectives({
  concept,
}: {
  concept: ExplorerConcept;
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
  analysisContext,
}: {
  area: AnalysisArea;
  selectedConcept: ExplorerConcept | undefined;
  selectedPerspective: AnalyticalPerspective | undefined;
  analysisContext: AnalysisContext | undefined;
}) {
  return (
    <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <AnalysisState label="Área" value={area.label} />

      <AnalysisState
        label="Concepto"
        value={selectedConcept?.label ?? "Sin definir"}
      />

      <AnalysisState
        label="Perspectiva"
        value={selectedPerspective?.label ?? "Sin definir"}
      />

      <AnalysisState
        label="Contexto"
        value={analysisContext?.label ?? "Sin definir"}
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


function AnalysisContextSelector({
  concept,
  perspective,
  selectedContextKey,
  selectedSeason,
  commercialSeasons,
  analysisContext,
}: {
  concept: ExplorerConcept;
  perspective: AnalyticalPerspective;
  selectedContextKey: ContextKey | undefined;
  selectedSeason: string | undefined;
  commercialSeasons: CommercialSeasonOption[];
  analysisContext: AnalysisContext | undefined;
}) {
  const basePath = `/analytics/explorer?area=commercial&concept=${concept.id}&perspective=${perspective.key}`;

  const options: Array<{
    key: ContextKey;
    label: string;
    description: string;
  }> = [
    {
      key: "active",
      label: "Campañas activas",
      description:
        "Analiza conjuntamente las campañas que están activas en este momento.",
    },
    {
      key: "single",
      label: "Una campaña",
      description:
        "Centra el análisis en una campaña comercial concreta.",
    },
    {
      key: "comparative",
      label: "Campaña vs hermana",
      description:
        "Compara una campaña con la campaña del mismo tipo del año anterior.",
    },
    {
      key: "historical",
      label: "Histórico completo",
      description:
        "Observa toda la información histórica disponible.",
    },
  ];

  return (
    <div className="mt-5 rounded-xl border border-dashed bg-slate-50 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Paso 4
      </p>

      <h4 className="mt-2 text-lg font-semibold">
        ¿En qué periodo quieres analizarlo?
      </h4>

      {!selectedContextKey ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {options.map((option) => (
            <Link
              key={option.key}
              href={`${basePath}&context=${option.key}`}
              className="group rounded-xl border bg-white p-4 transition hover:border-slate-400 hover:shadow-sm"
            >
              <p className="font-semibold">{option.label}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {option.description}
              </p>
            </Link>
          ))}
        </div>
      ) : selectedContextKey === "single" ||
        selectedContextKey === "comparative" ? (
        selectedSeason && analysisContext ? (
          <ResolvedContext
            label={analysisContext.label}
            changeHref={basePath}
          />
        ) : (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              Selecciona la campaña de referencia.
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {commercialSeasons.map((season) => {
                const disabled =
                  selectedContextKey === "comparative" &&
                  !season.previousSisterSeason;

                if (disabled) {
                  return (
                    <div
                      key={season.season}
                      className="rounded-lg border bg-slate-100 px-4 py-3 opacity-60"
                    >
                      <p className="font-semibold">{season.displayName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Sin campaña hermana anterior
                      </p>
                    </div>
                  );
                }

                return (
                  <Link
                    key={season.season}
                    href={`${basePath}&context=${selectedContextKey}&season=${encodeURIComponent(season.season)}`}
                    className="rounded-lg border bg-white px-4 py-3 transition hover:border-slate-400"
                  >
                    <p className="font-semibold">{season.displayName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {season.season}
                      {selectedContextKey === "comparative" &&
                      season.previousSisterSeason
                        ? ` vs ${season.previousSisterSeason}`
                        : ""}
                    </p>
                  </Link>
                );
              })}
            </div>

            <Link
              href={basePath}
              className="mt-4 inline-flex text-sm font-medium underline underline-offset-4"
            >
              Cambiar tipo de contexto
            </Link>
          </div>
        )
      ) : analysisContext ? (
        <ResolvedContext
          label={analysisContext.label}
          changeHref={basePath}
        />
      ) : null}
    </div>
  );
}

function ResolvedContext({
  label,
  changeHref,
}: {
  label: string;
  changeHref: string;
}) {
  return (
    <div className="mt-4 flex flex-col gap-4 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contexto seleccionado
        </p>
        <p className="mt-1 font-semibold">{label}</p>
      </div>

      <Link
        href={changeHref}
        className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition hover:bg-slate-50"
      >
        Cambiar contexto
      </Link>
    </div>
  );
}

async function resolveSelectedAnalysisContext(
  contextKey: ContextKey | undefined,
  season: string | undefined,
): Promise<AnalysisContext | undefined> {
  if (!contextKey) {
    return undefined;
  }

  if (contextKey === "active") {
    return resolveAnalysisContext();
  }

  if (contextKey === "historical") {
    return resolveAnalysisContext({ historical: true });
  }

  if (!season) {
    return undefined;
  }

  if (contextKey === "comparative") {
    return resolveAnalysisContext({
      season,
      compareWithPreviousSister: true,
    });
  }

  return resolveAnalysisContext({ season });
}

async function getExplorerCustomerMetricRows(
  conceptId: ConceptKey,
  context: AnalysisContext,
): Promise<ExplorerCustomerMetricRow[] | undefined> {
  switch (conceptId) {
    case "bsg-margin": {
      const rows = await getExplorerBsgMarginByCustomer(context);

      return rows.map((row) => ({
        ranking: row.ranking,
        customer: row.customer,
        current_value: row.current_value,
        current_percentage: row.current_margin_pct,
        comparison_value: row.comparison_value,
        comparison_percentage: row.comparison_margin_pct,
        delta_value: row.delta_value,
        delta_pct: row.delta_pct,
      }));
    }

    case "contribution": {
      const rows = await getExplorerContributionByCustomer(context);

      return rows.map((row) => ({
        ranking: row.ranking,
        customer: row.customer,
        current_value: row.current_value,
        current_percentage: row.current_contribution_pct,
        comparison_value: row.comparison_value,
        comparison_percentage: row.comparison_contribution_pct,
        delta_value: row.delta_value,
        delta_pct: row.delta_pct,
      }));
    }

    case "sales": {
      const rows = await getExplorerSalesByCustomer(context);

      return rows.map((row) => ({
        ranking: row.ranking,
        customer: row.customer,
        current_value: row.current_value,
        current_percentage: null,
        comparison_value: row.comparison_value,
        comparison_percentage: null,
        delta_value: row.delta_value,
        delta_pct: row.delta_pct,
      }));
    }

    case "purchases": {
      const rows = await getExplorerPurchasesByCustomer(context);

      return rows.map((row) => ({
        ranking: row.ranking,
        customer: row.customer,
        current_value: row.current_value,
        current_percentage: null,
        comparison_value: row.comparison_value,
        comparison_percentage: null,
        delta_value: row.delta_value,
        delta_pct: row.delta_pct,
      }));
    }

    case "xiamen-commission": {
      const rows =
        await getExplorerXiamenCommissionByCustomer(context);

      return rows.map((row) => ({
        ranking: row.ranking,
        customer: row.customer,
        current_value: row.current_value,
        current_percentage: row.current_commission_pct,
        comparison_value: row.comparison_value,
        comparison_percentage: row.comparison_commission_pct,
        delta_value: row.delta_value,
        delta_pct: row.delta_pct,
      }));
    }

    case "profitability": {
      const rows =
        await getExplorerProfitabilityByCustomer(context);

      return rows.map((row) => ({
        ranking: row.ranking,
        customer: row.customer,
        current_value: row.current_value,
        current_percentage: null,
        comparison_value: row.comparison_value,
        comparison_percentage: null,
        delta_value: row.delta_value,
        delta_pct: row.delta_pct,
      }));
    }

    default:
      return undefined;
  }
}

async function buildExplorerSummary(
  conceptId: ConceptKey,
  context: AnalysisContext,
  rows: ExplorerCustomerMetricRow[],
): Promise<ExplorerSummary> {
  const total = sumCurrentValues(rows);
  const customerCount = rows.length;
  const top3Share = calculateTop3Share(rows);

  switch (conceptId) {
    case "sales":
      return {
        primary: {
          label: "Ventas totales",
          value: total,
          format: "currency",
          currency: "USD",
        },
        secondary: {
          label: "Clientes con actividad",
          value: customerCount,
          format: "integer",
        },
        tertiary: {
          label: "Concentración (Top 3)",
          value: top3Share,
          format: "percentage",
        },
      };

    case "purchases":
      return {
        primary: {
          label: "Compras totales",
          value: total,
          format: "currency",
          currency: "USD",
        },
        secondary: {
          label: "Clientes con actividad",
          value: customerCount,
          format: "integer",
        },
        tertiary: {
            label: "Concentración (Top 3)",
          value: top3Share,
          format: "percentage",
        },
      };

    case "bsg-margin": {
      const salesRows = await getExplorerSalesByCustomer(context);
      const matchingSalesTotal = sumValuesForCustomers(
        salesRows,
        rows.map((row) => row.customer),
      );

      return {
        primary: {
          label: "Margen total",
          value: total,
          format: "currency",
          currency: "USD",
        },
        secondary: {
          label: "Margen global",
          value: calculatePercentage(total, matchingSalesTotal),
          format: "percentage",
        },
        tertiary: {
            label: "Concentración (Top 3)",
          value: top3Share,
          format: "percentage",
        },
      };
    }

    case "xiamen-commission":
      return {
        primary: {
          label: "Comisión total",
          value: total,
          format: "currency",
          currency: "USD",
        },
        secondary: {
            label: "Clientes con actividad",
          value: customerCount,
          format: "integer",
        },
        tertiary: {
            label: "Concentración (Top 3)",
          value: top3Share,
          format: "percentage",
        },
      };

    case "contribution": {
      const salesRows = await getExplorerSalesByCustomer(context);
      const matchingSalesTotal = sumValuesForCustomers(
        salesRows,
        rows.map((row) => row.customer),
      );

      return {
        primary: {
          label: "Contribución total",
          value: total,
          format: "currency",
          currency: "USD",
        },
        secondary: {
          label: "Contribución global",
          value: calculatePercentage(total, matchingSalesTotal),
          format: "percentage",
        },
        tertiary: {
            label: "Concentración (Top 3)",
          value: top3Share,
          format: "percentage",
        },
      };
    }

    case "profitability": {
      const [salesRows, contributionRows] = await Promise.all([
        getExplorerSalesByCustomer(context),
        getExplorerContributionByCustomer(context),
      ]);

      const contributionTotal = contributionRows.reduce(
        (sum, row) => sum + row.current_value,
        0,
      );
      const salesTotal = sumValuesForCustomers(
        salesRows,
        contributionRows.map((row) => row.customer),
      );
      const profitabilityRows = [...rows].sort(
        (a, b) => b.current_value - a.current_value,
      );
      const highest = profitabilityRows[0];
      const lowest =
        profitabilityRows[profitabilityRows.length - 1];

      return {
        primary: {
          label: "Rentabilidad global",
          value: calculatePercentage(contributionTotal, salesTotal),
          format: "percentage",
        },
        secondary: {
            label: "Cliente más rentable",
          value: highest
            ? `${highest.customer} · ${formatPercentageText(
                highest.current_value,
              )}`
            : null,
          format: "text",
        },
        tertiary: {
            label: "Cliente menos rentable",
          value: lowest
            ? `${lowest.customer} · ${formatPercentageText(
                lowest.current_value,
              )}`
            : null,
          format: "text",
        },
      };
    }
  }
}

function sumCurrentValues(rows: ExplorerCustomerMetricRow[]): number {
  return rows.reduce((sum, row) => sum + row.current_value, 0);
}

function calculateTop3Share(
  rows: ExplorerCustomerMetricRow[],
): number | null {
  const total = sumCurrentValues(rows);

  if (total === 0) {
    return null;
  }

  const top3Total = [...rows]
    .sort((a, b) => a.ranking - b.ranking)
    .slice(0, 3)
    .reduce((sum, row) => sum + row.current_value, 0);

  return (top3Total / total) * 100;
}

function calculatePercentage(
  numerator: number,
  denominator: number,
): number | null {
  return denominator === 0 ? null : (numerator / denominator) * 100;
}

function sumValuesForCustomers(
  rows: Array<{ customer: string; current_value: number }>,
  customers: string[],
): number {
  const customerSet = new Set(customers);

  return rows.reduce(
    (sum, row) =>
      customerSet.has(row.customer)
        ? sum + row.current_value
        : sum,
    0,
  );
}

function formatPercentageText(value: number): string {
  return `${new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} %`;
}

function buildSelectedCustomerSummary(
  conceptId: ConceptKey,
  context: AnalysisContext,
  allRows: ExplorerCustomerMetricRow[],
  selectedCustomer: string,
): CustomerKpiSummary {
  const selectedRow = allRows.find(
    (row) => row.customer === selectedCustomer,
  );

  if (!selectedRow) {
    return {
      primary: {
        label: "Valor actual",
        value: null,
        format: "text",
      },
      secondary: {
        label: "Posición en ranking",
        value: null,
        format: "text",
      },
      tertiary: {
        label: "Peso sobre el total",
        value: null,
        format: "percentage",
      },
    };
  }

  const concept = EXPLORER_CONCEPTS.find(
    (item) => item.id === conceptId,
  );
  const valueLabel =
    concept?.representation.valueLabel ?? "Valor";
  const valueFormat =
    conceptId === "profitability" ? "percentage" : "currency";
  const isComparative =
    context.type === "COMPARATIVE_SEASONS";

  if (isComparative) {
    return {
      primary: {
        label: `${valueLabel} actual`,
        value: selectedRow.current_value,
        format: valueFormat,
        ...(valueFormat === "currency"
          ? { currency: "USD" }
          : {}),
      },
      secondary: {
        label: `${valueLabel} campaña comparada`,
        value: selectedRow.comparison_value,
        format: valueFormat,
        ...(valueFormat === "currency"
          ? { currency: "USD" }
          : {}),
      },
      tertiary: {
        label: "Variación",
        value: selectedRow.delta_pct,
        format: "percentage",
      },
      ...(["sales", "bsg-margin"].includes(conceptId)
  ? {
      cards:
        conceptId === "sales"
          ? buildSalesSummary(selectedRow).map((card) => ({
              ...card,
              periodLabel: context.seasons[0],
              comparisonPeriodLabel:
                context.comparisonSeasons[0],
            }))
          : buildBsgMarginSummary(selectedRow).map((card) => ({
              ...card,
              periodLabel: context.seasons[0],
              comparisonPeriodLabel:
                context.comparisonSeasons[0],
            })),
    }
  : {}),
    };
  }

  const total = sumCurrentValues(allRows);
  const shareOfTotal =
    conceptId === "profitability"
      ? null
      : calculatePercentage(selectedRow.current_value, total);

  return {
    primary: {
      label: valueLabel,
      value: selectedRow.current_value,
      format: valueFormat,
      ...(valueFormat === "currency"
        ? { currency: "USD" }
        : {}),
    },
    secondary:
      selectedRow.current_percentage !== null
        ? {
            label:
              concept &&
              "percentageLabel" in concept.representation
                ? concept.representation.percentageLabel ??
                  `${valueLabel} %`
                : `${valueLabel} %`,
            value: selectedRow.current_percentage,
            format: "percentage",
          }
        : {
            label: "Posición en ranking",
            value: `${selectedRow.ranking} de ${allRows.length}`,
            format: "text",
          },
    tertiary:
      conceptId === "profitability"
        ? {
            label: "Clientes comparados",
            value: allRows.length,
            format: "integer",
          }
        : {
            label: "Peso sobre el total",
            value: shareOfTotal,
            format: "percentage",
          },
  };
}

function CustomerSelector({
  customers,
  selectedCustomer,
  area,
  concept,
  perspective,
  context,
  season,
}: {
  customers: string[];
  selectedCustomer: string | undefined;
  area: AreaKey;
  concept: ConceptKey;
  perspective: PerspectiveKey;
  context: ContextKey;
  season: string | undefined;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Cliente
        </p>
        <h2 className="mt-1 text-lg font-semibold">
          ¿Quieres aislar un cliente?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mantén «Todos los clientes» para ver el ranking completo o
          selecciona uno para analizarlo de forma aislada.
        </p>
      </div>

      <form
        method="get"
        action="/analytics/explorer"
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="area" value={area} />
        <input type="hidden" name="concept" value={concept} />
        <input
          type="hidden"
          name="perspective"
          value={perspective}
        />
        <input type="hidden" name="context" value={context} />
        {season ? (
          <input type="hidden" name="season" value={season} />
        ) : null}

        <label className="flex-1">
          <span className="mb-1.5 block text-sm font-medium">
            Cliente seleccionado
          </span>
          <select
            name="customer"
            defaultValue={selectedCustomer ?? ""}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Todos los clientes</option>
            {customers.map((customer) => (
              <option key={customer} value={customer}>
                {customer}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Aplicar
        </button>
      </form>
    </section>
  );
}

function CustomerMetricResult({
  concept,
  context,
  rows,
  allRows,
  summary,
  selectedCustomer,
  selectedAreaKey,
  selectedConceptKey,
  selectedPerspectiveKey,
  selectedContextKey,
  selectedSeason,
}: {
  concept: ExplorerConcept;
  context: AnalysisContext;
  rows: ExplorerCustomerMetricRow[];
  allRows: ExplorerCustomerMetricRow[];
  summary: ExplorerSummary;
  selectedCustomer: string | undefined;
  selectedAreaKey: AreaKey;
  selectedConceptKey: ConceptKey;
  selectedPerspectiveKey: PerspectiveKey;
  selectedContextKey: ContextKey;
  selectedSeason: string | undefined;
}) {
  const [currentPeriodLabel, comparisonPeriodLabel] =
    context.label.split(" vs ");

  const isComparative =
    context.type === "COMPARATIVE_SEASONS";
  const representation = concept.representation;
  const percentageLabel =
    "percentageLabel" in representation
      ? representation.percentageLabel ??
        `${representation.valueLabel} %`
      : `${representation.valueLabel} %`;

  const preferredColumns = isComparative
    ? [
        "ranking",
        "customer",
        "current_value",
        ...(representation.showPercentage
          ? ["current_percentage"]
          : []),
        "comparison_value",
        ...(representation.showPercentage
          ? ["comparison_percentage"]
          : []),
        "delta_value",
        "delta_pct",
      ]
    : [
        "ranking",
        "customer",
        "current_value",
        ...(representation.showPercentage
          ? ["current_percentage"]
          : []),
      ];

  const valueLabel = isComparative
    ? `${representation.valueLabel} ${currentPeriodLabel}`
    : representation.valueLabel;
  const customers = [...allRows]
    .sort((a, b) => a.ranking - b.ranking)
    .map((row) => row.customer);
  const resultTitle = selectedCustomer
    ? `${representation.valueLabel} de ${selectedCustomer}`
    : `${representation.valueLabel} por cliente`;

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Resultado automático
        </p>

        <h2 className="mt-1 text-xl font-semibold">
          {resultTitle}
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          {context.label}. {concept.businessMeaning}
        </p>
      </div>

      <CustomerSelector
        customers={customers}
        selectedCustomer={selectedCustomer}
        area={selectedAreaKey}
        concept={selectedConceptKey}
        perspective={selectedPerspectiveKey}
        context={selectedContextKey}
        season={selectedSeason}
      />

      <ExplorerSummaryCard summary={summary} />

      <div className="grid gap-5 xl:grid-cols-2">
        <AnalyticsBarChart
          title={selectedCustomer ? "Vista del cliente" : "Ranking visual"}
          rows={rows}
          labelKeys={["customer"]}
          valueKeys={["current_value"]}
          valueLabel={valueLabel}
          valueFormat={concept.valueFormat}
          maxItems={10}
        />

        <AnalyticsRankingTable
          title={
            selectedCustomer
              ? isComparative
                ? `Detalle comparativo de ${selectedCustomer}`
                : `Detalle de ${selectedCustomer}`
              : isComparative
                ? "Ranking y variación frente a campaña hermana"
                : `Ranking de ${representation.valueLabel.toLocaleLowerCase(
                    "es-ES",
                  )}`
          }
          rows={rows}
          preferredColumns={preferredColumns}
          columnLabels={{
            ranking: "Ranking",
            customer: "Cliente",
            current_value: valueLabel,
            current_percentage: isComparative
              ? `${percentageLabel} ${currentPeriodLabel}`
              : percentageLabel,
            comparison_value: isComparative
              ? `${representation.valueLabel} ${comparisonPeriodLabel}`
              : `${representation.valueLabel} campaña anterior`,
            comparison_percentage: isComparative
              ? `${percentageLabel} ${comparisonPeriodLabel}`
              : `${percentageLabel} campaña anterior`,
            delta_value: "Diferencia",
            delta_pct: "Variación",
          }}
          columnFormats={{
            ranking: "number",
            current_value: concept.valueFormat,
            current_percentage: "percentage",
            comparison_value: concept.valueFormat,
            comparison_percentage: "percentage",
            delta_value: concept.valueFormat,
            delta_pct: "percentage",
          }}
          maxHeightClassName="max-h-[520px]"
        />
      </div>
    </section>
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


function getSelectedContext(
  perspective: PerspectiveKey | undefined,
  value: string | string[] | undefined,
): ContextKey | undefined {
  if (!perspective) {
    return undefined;
  }

  const normalizedValue = getSearchParam(value);

  return ["active", "single", "comparative", "historical"].includes(
    normalizedValue ?? "",
  )
    ? (normalizedValue as ContextKey)
    : undefined;
}

function getSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  const cleanedValue = normalizedValue?.trim();

  return cleanedValue || undefined;
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
  
    return EXPLORER_CONCEPTS.some(
      (concept) => concept.id === normalizedValue,
    )
      ? (normalizedValue as ConceptKey)
      : undefined;
  }
  
  function getSelectedPerspective(
    area: AreaKey | undefined,
    concept: ConceptKey | undefined,
    value: string | string[] | undefined,
  ): PerspectiveKey | undefined {
    if (area !== "commercial" || !concept) {
      return undefined;
    }
  
    const normalizedValue = Array.isArray(value) ? value[0] : value;
  
    return commercialPerspectives.some(
      (perspective) => perspective.key === normalizedValue,
    )
      ? (normalizedValue as PerspectiveKey)
      : undefined;
  }