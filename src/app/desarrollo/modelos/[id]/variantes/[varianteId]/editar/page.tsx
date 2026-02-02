"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Variante = {
  id: string;
  modelo_id: string;
  season: string;
  color: string | null;
  factory: string | null;
  reference: string | null;
  notes: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export default function EditVariantePage() {
  const params = useParams<{ id: string; varianteId: string }>();
  const modeloId = params?.id || "";
  const varianteId = params?.varianteId || "";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const [variante, setVariante] = useState<Variante | null>(null);

  // form
  const [season, setSeason] = useState("");
  const [color, setColor] = useState("");
  const [factory, setFactory] = useState("");
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState("activo");
  const [notes, setNotes] = useState("");

  const load = async () => {
    if (!varianteId) return;

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`/api/variantes/${varianteId}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error || "Error cargando variante");

      setVariante(json);

      setSeason(String(json.season || ""));
      setColor(String(json.color || ""));
      setFactory(String(json.factory || ""));
      setReference(String(json.reference || ""));
      setStatus(String(json.status || "activo"));
      setNotes(String(json.notes || ""));
    } catch (e: any) {
      setVariante(null);
      setMsg("❌ " + (e?.message || "Error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [varianteId]);

  const save = async () => {
    if (!varianteId) return;

    const seasonTrim = season.trim();
    const colorTrim = color.trim();

    if (!seasonTrim) {
      setMsg("❌ season es obligatorio");
      return;
    }
    if (!colorTrim) {
      setMsg("❌ color es obligatorio");
      return;
    }

    setSaving(true);
    setMsg("");

    try {
      const res = await fetch(`/api/variantes/${varianteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: seasonTrim,
          color: colorTrim,
          factory: factory.trim() || null,
          reference: reference.trim() || null,
          status: status.trim() || "activo",
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error guardando variante");

      setMsg("✅ Variante guardada.");

      // volver al detalle de variante
      router.push(`/desarrollo/modelos/${modeloId}/variantes/${varianteId}`);
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Cargando…</div>;

  if (!variante) {
    return (
      <div className="p-8 space-y-3">
        <div className="text-red-600 font-semibold">Variante no encontrada</div>
        {msg ? <div className="text-sm bg-gray-50 border rounded p-2">{msg}</div> : null}
        <button
          onClick={() => router.push(`/desarrollo/modelos/${modeloId}`)}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition text-sm"
        >
          ← Volver al modelo
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">✏️ Editar variante</h1>

        <div className="flex gap-2">
          <Link
            href={`/desarrollo/modelos/${modeloId}/variantes/${varianteId}`}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition text-sm"
          >
            ← Volver
          </Link>
        </div>
      </div>

      {msg ? <div className="text-sm bg-gray-50 border rounded p-2">{msg}</div> : null}

      <div className="bg-white rounded-xl shadow p-5 border border-gray-200 space-y-4">
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block font-semibold mb-1">Season *</label>
            <input
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="SS26"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Color *</label>
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="CHI"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Factory</label>
            <input
              value={factory}
              onChange={(e) => setFactory(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="BUKE / XIAMEN..."
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Reference</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="MINATO-CHI-SS26"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="activo">activo</option>
              <option value="inactivo">inactivo</option>
              <option value="archivado">archivado</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block font-semibold mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded px-3 py-2 min-h-[90px]"
              placeholder="Notas internas…"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition text-sm disabled:opacity-50"
          >
            {saving ? "Guardando…" : "💾 Guardar"}
          </button>

          <button
            onClick={load}
            disabled={saving}
            className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 transition text-sm disabled:opacity-50"
          >
            ↻ Recargar
          </button>
        </div>

        <div className="text-xs text-gray-500">
          * Season + Color deben ser únicos por modelo (uq_modelo_variantes_modelo_season_color).
        </div>
      </div>
    </div>
  );
}
