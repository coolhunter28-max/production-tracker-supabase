/**
 * Normaliza un texto para comparaciones de identidad.
 *
 * Ejemplos:
 *  "Marrón"      -> "MARRON"
 *  "Marr�n"      -> "MARRON"
 *  "  Marron  "  -> "MARRON"
 *  "Off White"   -> "OFF WHITE"
 */
export function normalizeIdentity(
    value: string | null | undefined
  ): string {
    return (value ?? "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\uFFFD/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }
  export function sameIdentity(
    a: string | null | undefined,
    b: string | null | undefined
  ): boolean {
    return normalizeIdentity(a) === normalizeIdentity(b);
  }