src/lib/get-approval.ts

// Detecta la aprobación desde las columnas reales del CSV
export function getApprovalFromRow(row: Record<string, any>, tipo: "CFMS" | "PPS"): string | null {
  const key = tipo === "CFMS" ? "CFMs Approval" : "PPS Approval";

  if (!row[key]) return null;

  const value = String(row[key]).trim();
  return value === "" ? null : value;
}
