// src/lib/import.ts
// Reexportar la función desde el archivo completo
export { importCSV } from './import-complete';
export interface CSVRow {
  [key: string]: string;
}