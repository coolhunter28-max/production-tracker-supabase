/**
 * Compatibilidad temporal.
 *
 * El contexto de análisis pertenece ahora a la capa compartida
 * de Analytics. Este archivo se conserva para no romper imports
 * existentes durante la migración.
 */

export * from "@/lib/analytics/context/analysis-context";