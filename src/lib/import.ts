// src/lib/import.ts

export { syncToSupabase } from "./import-complete";

export interface CSVRow {
  [key: string]: string;
}