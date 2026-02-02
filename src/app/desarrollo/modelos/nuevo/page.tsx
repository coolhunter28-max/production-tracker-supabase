// src/app/desarrollo/modelos/nuevo/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function NuevoModeloPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [style, setStyle] = useState("");
  const [reference, setReference] = useState("");
  const [customer, setCustomer] = useState("");
  const [supplier, setSupplier] = useState("");
  const [factory, setFactory] = useState("");
  const [merchandiserFactory, setMerchandiserFactory] = useState("");
  const [construction, setConstruction] = useState("");
  const [sizeRange, setSizeRange] = useState("");
  const [lastNo, setLastNo] = useState("");
  const [lastName, setLastName] = useState("");
  const [packagingPrice, setPackagingPrice] = useState<number | "">("");
  const [status, setStatus] = useState("en_desarrollo");
  const [description, setDescription] = useState("");

  const styleOk = useMemo(() => !!normalizeText(style), [style]);

  const create = async () => {
    if (saving) return;
    setMsg("");

    if (!styleOk) {
      setMsg("❌ Style es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        style: normalizeText(style),
        reference: normalizeText(reference) ?? normalizeText(style), // si reference vacío -> style
        customer: normalizeText(customer),
        supplier: normalizeText(supplier),
        factory: normalizeText(factory),
        merchandiser_factory: normalizeText(merchandiserFactory),
        construction: normalizeText(construction),
        size_range: normalizeText(sizeRange),
        last_no: normalizeText(lastNo),
        last_name: normalizeText(lastName),
        status: normalizeText(status) ?? "en_desarrollo",
        description: normalizeText(description),
        packaging_price:
          packagingPrice === "" || packagingPrice === null || packagingPrice === undefined
            ? null
            : Number(packagingPrice),
      };

      const res = await fetch("/api/modelos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error creando modelo");

      const newId = json?.modelo?.id;
      if (!newId) throw new Error("Modelo creado pero no se recibió el id.");

      setMsg("✅ Modelo creado.");
      router.push(`/desarrollo/modelos/${newId}`);
      router.refresh();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">➕ Nuevo modelo</h1>

        <div className="flex gap-2">
          <Link
            href="/desarrollo/modelos"
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition text-sm"
          >
            ← Volver
          </Link>

          <button
            onClick={create}
            disabled={saving || !styleOk}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition text-sm disabled:opacity-60"
            title={!styleOk ? "Style es obligatorio" : ""}
          >
            {saving ? "Creando..." : "Crear"}
          </button>
        </div>
      </div>

      {msg ? <div className="text-sm bg-gray-50 border rounded p-3">{msg}</div> : null}

      <div className="bg-white rounded-xl shadow p-5 border border-gray-200 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <InputRow
            label="Style"
            required
            value={style}
            onChange={setStyle}
            placeholder="MINATO"
          />

          <InputRow
            label="Reference"
            value={reference}
            onChange={setReference}
            placeholder="(si vacío, usará Style)"
          />

          <InputRow
            label="Customer"
            value={customer}
            onChange={setCustomer}
            placeholder="MORRISON"
          />

          <InputRow
            label="Supplier"
            value={supplier}
            onChange={setSupplier}
            placeholder="XIAMEN DIC / BSG"
          />

          <InputRow
            label="Factory"
            value={factory}
            onChange={setFactory}
            placeholder="BUKE / ND / ..."
          />

          <InputRow
            label="Merchandiser (Factory)"
            value={merchandiserFactory}
            onChange={setMerchandiserFactory}
            placeholder="RITA"
          />

          <InputRow
            label="Construction"
            value={construction}
            onChange={setConstruction}
            placeholder="DIC-xxxx"
          />

          <InputRow
            label="Size range"
            value={sizeRange}
            onChange={setSizeRange}
            placeholder="35-46"
          />

          <InputRow
            label="Last No"
            value={lastNo}
            onChange={setLastNo}
            placeholder="DIC-xxxx"
          />

          <InputRow
            label="Last Name"
            value={lastName}
            onChange={setLastName}
            placeholder="BROWNIE_BiloLuu"
          />

          <div className="space-y-1">
            <div className="text-[12px] font-semibold text-gray-700">Packaging price</div>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-3 py-2 text-sm bg-white"
              value={packagingPrice}
              onChange={(e) =>
                setPackagingPrice(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1">
            <div className="text-[12px] font-semibold text-gray-700">Status</div>
            <select
              className="w-full border rounded px-3 py-2 text-sm bg-white"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="en_desarrollo">en_desarrollo</option>
              <option value="activo">activo</option>
              <option value="en_fabricacion">en_fabricacion</option>
              <option value="cancelado">cancelado</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[12px] font-semibold text-gray-700">Description</div>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm bg-white min-h-[90px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas del modelo..."
          />
        </div>
      </div>
    </div>
  );
}
