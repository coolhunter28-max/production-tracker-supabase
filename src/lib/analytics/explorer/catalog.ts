export type ExplorerAreaId = "commercial";

export type ExplorerConceptId =
  | "contribution"
  | "sales"
  | "purchases"
  | "bsg-margin"
  | "xiamen-commission"
  | "profitability";

export type ExplorerMetricKey =
  | "contribution_total"
  | "sell_amount_total"
  | "buy_amount_total"
  | "margin_bsg_total"
  | "margin_xiamen_total"
  | "contribution_pct";

export type ExplorerValueFormat = "currency" | "percentage";

export type ExplorerChartType = "bar";

export type ExplorerRepresentation = {
  valueLabel: string;
  percentageLabel?: string;
  showPercentage: boolean;
  chart: ExplorerChartType;
};

export type ExplorerConcept = {
  id: ExplorerConceptId;
  areaId: ExplorerAreaId;
  label: string;
  shortDescription: string;
  businessMeaning: string;
  metric: ExplorerMetricKey;
  valueFormat: ExplorerValueFormat;
  representation: ExplorerRepresentation;
  interpretation: string;
  caution?: string;
};

export const EXPLORER_CONCEPTS = [
  {
    id: "contribution",
    areaId: "commercial",
    label: "Contribución",
    shortDescription:
      "Aportación económica total generada por cada cliente.",
    businessMeaning:
      "En BSG suma el margen de compraventa y el 10 % sobre el importe de compra. En Xiamen representa el 10 % de comisión sobre el importe.",
    metric: "contribution_total",
    valueFormat: "currency",
    representation: {
      valueLabel: "Contribución",
      percentageLabel: "Contribución %",
      showPercentage: true,
      chart: "bar",
    },
    interpretation:
      "Permite conocer cuánto dinero aporta cada cliente, fábrica, temporada u operativa a la empresa.",
    caution:
      "Debe interpretarse junto con el volumen de ventas. Una operativa con menor porcentaje puede generar una aportación absoluta mayor.",
  },
  {
    id: "sales",
    areaId: "commercial",
    label: "Ventas",
    shortDescription: "Volumen económico vendido.",
    businessMeaning:
      "Representa el importe total de venta generado por la actividad comercial.",
    metric: "sell_amount_total",
    valueFormat: "currency",
    representation: {
      valueLabel: "Ventas",
      showPercentage: false,
      chart: "bar",
    },
    interpretation:
      "Permite comparar el peso económico de clientes, fábricas, temporadas y operativas.",
  },
  {
    id: "purchases",
    areaId: "commercial",
    label: "Compras",
    shortDescription: "Coste económico asociado a la compra del producto.",
    businessMeaning:
      "Representa el importe total de compra registrado en las operaciones donde existe coste de compra.",
    metric: "buy_amount_total",
    valueFormat: "currency",
    representation: {
      valueLabel: "Compras",
      showPercentage: false,
      chart: "bar",
    },
    interpretation:
      "Ayuda a entender el coste soportado por la operativa BSG y su relación con las ventas.",
    caution:
      "No debe compararse entre operativas sin tener en cuenta que Xiamen funciona mediante comisión y no con la misma estructura económica que BSG.",
  },
  {
    id: "bsg-margin",
    areaId: "commercial",
    label: "Margen BSG",
    shortDescription: "Margen generado por la operativa BSG.",
    businessMeaning:
      "Representa exclusivamente la diferencia entre el importe de venta y el importe de compra en la operativa BSG.",
    metric: "margin_bsg_total",
    valueFormat: "currency",
    representation: {
      valueLabel: "Margen",
      percentageLabel: "Margen %",
      showPercentage: true,
      chart: "bar",
    },
    interpretation:
      "Permite analizar qué clientes y operaciones generan más margen dentro de BSG.",
    caution:
      "No incluye el 10 % adicional sobre el importe de compra. Para conocer la aportación económica total debe analizarse el concepto Contribución.",
  },
  {
    id: "xiamen-commission",
    areaId: "commercial",
    label: "Comisión Xiamen",
    shortDescription: "Comisión generada por la operativa Xiamen.",
    businessMeaning:
      "Representa la remuneración obtenida sobre las ventas gestionadas mediante Xiamen.",
    metric: "margin_xiamen_total",
    valueFormat: "currency",
    representation: {
      valueLabel: "Comisión",
      percentageLabel: "Comisión %",
      showPercentage: true,
      chart: "bar",
    },
    interpretation:
      "Permite conocer la aportación económica absoluta de los clientes y operaciones de Xiamen.",
    caution:
      "Un porcentaje aparentemente reducido puede producir una contribución elevada cuando el volumen de ventas es grande.",
  },
  {
    id: "profitability",
    areaId: "commercial",
    label: "Rentabilidad",
    shortDescription:
      "Relación porcentual entre la contribución y las ventas.",
    businessMeaning:
      "Mide qué proporción del volumen vendido se transforma en aportación económica para la empresa.",
    metric: "contribution_pct",
    valueFormat: "percentage",
    representation: {
      valueLabel: "Rentabilidad",
      showPercentage: false,
      chart: "bar",
    },
    interpretation:
      "Permite contextualizar la aportación económica en relación con el volumen de ventas.",
    caution:
      "Debe analizarse junto con la contribución absoluta. Un porcentaje menor no implica necesariamente menor valor económico.",
  },
] as const satisfies readonly ExplorerConcept[];

export function getExplorerConcept(
  conceptId: ExplorerConceptId,
): ExplorerConcept {
  const concept = EXPLORER_CONCEPTS.find((item) => item.id === conceptId);

  if (!concept) {
    throw new Error(`Unknown Explorer concept: ${conceptId}`);
  }

  return concept;
}

export function getExplorerConceptsByArea(
  areaId: ExplorerAreaId,
): readonly ExplorerConcept[] {
  return EXPLORER_CONCEPTS.filter((concept) => concept.areaId === areaId);
}