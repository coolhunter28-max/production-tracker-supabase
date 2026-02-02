// src/app/desarrollo/modelos/[id]/editar/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Modelo = {
  id: string;
  style: string | null;
  description: string | null;
  supplier: string | null;
  customer: string | null;
  factory: string | null;
  merchandiser_factory: string | null;
  construction: string | null;
  reference: string | null;
  size_range: string | null;
  last_no: string | null;
  last_name: string | null;
  packaging_price: number | null;
  status: string | null;
};

function normalizeText(v: any) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function InputRow({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[12px] font-semibold text-gray-700">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </div>
      <input
        className="w-full border rounded px-3 py-2 text-sm bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
      />
    </div>
  );
}

export default function EditModeloPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState<Modelo>({
    id: "",
    style: "",
    description: "",
    supplier: "",
    customer: "",
    factory: "",
    merchandiser_factory: "",
    construction: "",
    reference: "",
    size_range: "",
    last_no: "",
    last_name: "",
    packaging_price: null,
    status: "en_desarrollo",
  });

  const styleOk = useMemo(() => {
    return !!normalizeText(form.style);
  }, [form.style]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/modelos/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando modelo");

      setForm({
        id: json.id,
        style: json.style ?? "",
        description: json.description ?? "",
        supplier: json.supplier ?? "",
        customer: json.customer ?? "",
        factory: json.factory ?? "",
        merchandiser_factory: json.merchandiser_factory ?? "",
        construction: json.construction ?? "",
        reference: json.reference ?? "",
        size_range: json.size_range ?? "",
        last_no: json.last_no ?? "",
        last_name: json.last_name ?? "",
        packaging_price:
          json.packaging_price === null || json.packaging_price === undefined
            ? null
            : Number(json.packaging_price),
        status: json.status ?? "en_desarrollo",
      });
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async () => {
    if (!id) return;
    if (saving) return;

    setMsg("");

    // Validación mínima
    if (!styleOk) {
      setMsg("❌ Style es obligatorio.");
      return;
    }

    setSaving(true);

    try {
      const payload: any = {
        style: normalizeText(form.style),
        description: normalizeText(form.description),
        supplier: normalizeText(form.supplier),
        customer: normalizeText(form.customer),
        factory: normalizeText(form.factory),
        merchandiser_factory: normalizeText(form.merchandiser_factory),
        construction: normalizeText(form.construction),
        reference: normalizeText(form.reference) ?? normalizeText(form.style), // si reference vacío -> style
        size_range: normalizeText(form.size_range),
        last_no: normalizeText(form.last_no),
        last_name: normalizeText(form.last_name),
        status: normalizeText(form.status) ?? "en_desarrollo",
        packaging_price:
          form.packaging_price === null || form.packaging_price === undefined
            ? null
            : Number(form.packaging_price),
      };

      const res = await fetch(`/api/modelos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error guardando modelo");

      setMsg("✅ Modelo actualizado.");
      router.push(`/desarrollo/modelos/${id}`);
      router.refresh();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Cargando...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">✏️ Editar modelo</h1>

        <div className="flex gap-2">
          <Link
            href={`/desarrollo/modelos/${id}`}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition text-sm"
          >
            ← Volver
          </Link>

          <button
            onClick={() => {
              setMsg("");
              router.push(`/desarrollo/modelos/${id}`);
            }}
            className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 transition text-sm"
          >
            Cancelar
          </button>

          <button
            onClick={save}
            disabled={saving || !styleOk}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition text-sm disabled:opacity-60"
            title={!styleOk ? "Style es obligatorio" : ""}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {msg ? (
        <div className="text-sm bg-gray-50 border rounded p-3">{msg}</div>
      ) : null}

      <div className="bg-white rounded-xl shadow p-5 border border-gray-200 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <InputRow
            label="Style"
            required
            value={form.style || ""}
            onChange={(v) => setForm((p) => ({ ...p, style: v }))}
            placeholder="MINATO"
          />

          <InputRow
            label="Reference"
            value={form.reference || ""}
            onChange={(v) => setForm((p) => ({ ...p, reference: v }))}
            placeholder="(si vacío, usará Style)"
          />

          <InputRow
            label="Customer"
            value={form.customer || ""}
            onChange={(v) => setForm((p) => ({ ...p, customer: v }))}
            placeholder="MORRISON"
          />

          <InputRow
            label="Supplier"
            value={form.supplier || ""}
            onChange={(v) => setForm((p) => ({ ...p, supplier: v }))}
            placeholder="XIAMEN DIC / BSG"
          />

          <InputRow
            label="Factory"
            value={form.factory || ""}
            onChange={(v) => setForm((p) => ({ ...p, factory: v }))}
            placeholder="BUKE / ND / ..."
          />

          <InputRow
            label="Merchandiser (Factory)"
            value={form.merchandiser_factory || ""}
            onChange={(v) =>
              setForm((p) => ({ ...p, merchandiser_factory: v }))
            }
            placeholder="RITA"
          />

          <InputRow
            label="Construction"
            value={form.construction || ""}
            onChange={(v) => setForm((p) => ({ ...p, construction: v }))}
            placeholder="DIC-xxxx"
          />

          <InputRow
            label="Size range"
            value={form.size_range || ""}
            onChange={(v) => setForm((p) => ({ ...p, size_range: v }))}
            placeholder="35-46"
          />

          <InputRow
            label="Last No"
            value={form.last_no || ""}
            onChange={(v) => setForm((p) => ({ ...p, last_no: v }))}
            placeholder="DIC-xxxx"
          />

          <InputRow
            label="Last Name"
            value={form.last_name || ""}
            onChange={(v) => setForm((p) => ({ ...p, last_name: v }))}
            placeholder="BROWNIE_BiloLuu"
          />

          <div className="space-y-1">
            <div className="text-[12px] font-semibold text-gray-700">
              Packaging price
            </div>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-3 py-2 text-sm bg-white"
              value={form.packaging_price ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  packaging_price:
                    e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              placeholder="0.00"
            />
            <div className="text-[11px] text-gray-500">
              (opcional) Precio packaging base del modelo.
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[12px] font-semibold text-gray-700">Status</div>
            <select
              className="w-full border rounded px-3 py-2 text-sm bg-white"
              value={form.status || ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value }))
              }
            >
              <option value="en_desarrollo">en_desarrollo</option>
              <option value="activo">activo</option>
              <option value="en_fabricacion">en_fabricacion</option>
              <option value="cancelado">cancelado</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[12px] font-semibold text-gray-700">
            Description
          </div>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm bg-white min-h-[90px]"
            value={form.description || ""}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="Notas del modelo..."
          />
        </div>
      </div>
    </div>
  );
}
