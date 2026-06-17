// Detecta la aprobación desde las columnas reales del CSV
export function getApprovalFromRow(
  row: Record<string, unknown>,
  tipo: "CFMS" | "PPS"
): string | null {
  const keys =
    tipo === "CFMS"
      ? ["CFMS", "CFM", "CONFIRMATION SAMPLE"]
      : ["PPS", "PRE PRODUCTION SAMPLE"];

  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return null;
}