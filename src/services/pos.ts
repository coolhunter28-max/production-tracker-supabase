import { PO } from "@/types";

export async function fetchPOs(): Promise<PO[]> {
  const response = await fetch("/api/pos", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("❌ Error fetching POs:", response.statusText);
    return [];
  }

  const data = await response.json();

  return data as PO[];
}