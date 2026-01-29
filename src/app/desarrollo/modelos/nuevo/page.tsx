"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NuevoModeloPage() {
  const router = useRouter();

  const [style, setStyle] = useState("");
  const [customer, setCustomer] = useState("");
  const [supplier, setSupplier] = useState("");
  const [factory, setFactory] = useState("");
  const [status, setStatus] = useState("en_fabricacion");
  const [sizeRange, setSizeRange] = useState("");

  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    setMsg("");

    const styleClean = style.trim();
    if (!styleClean) {
      setMsg("❌ Style es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/modelos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: styleClean,
          reference: styleClean,
          customer: customer.trim() || null,
          supplier: supplier.trim() || null,
          factory: factory.trim() || null,
          status,
          size_range: sizeRange.trim() || null,
        }),
      });

      const json = await res.json();

      if (!res.ok || json?.status !== "ok") {
        throw new Error(json?.error || "Error creando modelo");
      }

      const id = json?.modelo?.id;
      if (!id) throw new Error("No se recibió el id del modelo.");

      router.push(`/desarrollo/modelos/${id}`);
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">+ Nuevo modelo</h1>
          <p className="text-sm text-gray-600">
            Crea el modelo base (style). Luego añades imágenes y variantes.
          </p>
        </div>

        <Link
          href="/desarrollo/modelos"
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
        >
          ← Volver
        </Link>
      </div>

      {msg ? (
        <div className="text-sm bg-gray-50 border rounded p-3">{msg}</div>
      ) : null}

      <div className="bg-white border rounded-xl shadow p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold">Style *</label>
            <input
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="MINATO"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="en_desarrollo">en_desarrollo</option>
              <option value="activo">activo</option>
              <option value="en_fabricacion">en_fabricacion</option>
              <option value="cancelado">cancelado</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">Customer</label>
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="MORRISON"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Supplier</label>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="XIAMEN DIC / BSG"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Factory</label>
            <input
              value={factory}
              onChange={(e) => setFactory(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="(opcional)"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Size range</label>
            <input
              value={sizeRange}
              onChange={(e) => setSizeRange(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="35-46"
            />
          </div>
        </div>

        <button
          onClick={create}
          disabled={saving}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm disabled:opacity-50"
        >
          {saving ? "Creando…" : "Crear modelo"}
        </button>
      </div>
    </div>
  );
}
