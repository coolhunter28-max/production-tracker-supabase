"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NuevoPO() {
  const router = useRouter();

  const [po, setPO] = useState<any>({
    season: "",
    po: "",
    customer: "",
    supplier: "",
    factory: "",
    proforma_invoice: "",
    po_date: "",
    etd_pi: "",
    booking: "",
    closing: "",
    shipping_date: "",
    inspection: "",
    estado_inspeccion: "",
    currency: "USD",
    lineas_pedido: [],
  });

  // 🔹 Formateo de moneda
  const formatCurrency = (value: number) => {
    return po.currency === "EUR"
      ? `€ ${value.toFixed(2)}`
      : `$ ${value.toFixed(2)}`;
  };

  // 🔹 Totales dinámicos
  const totalPairs =
    po.lineas_pedido?.reduce((acc: number, l: any) => acc + (l.qty || 0), 0) || 0;
  const totalAmount =
    po.lineas_pedido?.reduce(
      (acc: number, l: any) => acc + (l.qty || 0) * (l.price || 0),
      0
    ) || 0;

  const guardar = async () => {
    try {
      const res = await fetch(`/api/po`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(po),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const nuevo = await res.json();
      alert("✅ PO creado correctamente");
      router.push(`/po/${nuevo.id}/editar`);
    } catch (err) {
      console.error("❌ Error al guardar:", err);
      alert("Error al guardar");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">➕ Crear nuevo PO</h1>

      {/* 🔹 Cabecera igual a EditarPO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <label>
          Season
          <input
            type="text"
            value={po.season}
            onChange={(e) => setPO({ ...po, season: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        <label>
          PO
          <input
            type="text"
            value={po.po}
            onChange={(e) => setPO({ ...po, po: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        <label>
          Customer
          <input
            type="text"
            value={po.customer}
            onChange={(e) => setPO({ ...po, customer: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        <label>
          Supplier
          <input
            type="text"
            value={po.supplier}
            onChange={(e) => setPO({ ...po, supplier: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        {/* ... sigue igual que en EditarPO con los demás campos */}
        <label>
          Moneda
          <select
            value={po.currency}
            onChange={(e) => setPO({ ...po, currency: e.target.value })}
            className="border w-full px-2 py-1"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </label>
      </div>

      {/* 🔹 Líneas de pedido y muestras (copiar igual que en EditarPO) */}

      <button
        onClick={() => {
          const copy = [...po.lineas_pedido];
          copy.push({
            reference: "",
            style: "",
            color: "",
            size_run: "",
            qty: 0,
            price: 0,
            amount: 0,
            trial_upper: "",
            trial_lasting: "",
            lasting: "",
            finish_date: "",
            muestras: [],
          });
          setPO({ ...po, lineas_pedido: copy });
        }}
        className="mt-2 border px-2 py-1 text-xs rounded bg-gray-50"
      >
        ➕ Añadir línea
      </button>

      {/* 🔹 Totales dinámicos */}
      <div className="p-3 bg-gray-100 rounded border text-sm font-semibold">
        📊 Total Pares: {totalPairs} · Total Importe: {formatCurrency(totalAmount)}
      </div>

      {/* 🔹 Botones */}
      <div className="flex gap-2">
        <button
          onClick={guardar}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          💾 Guardar
        </button>
        <button
          onClick={() => router.push("/")}
          className="bg-gray-300 px-3 py-1 rounded text-sm"
        >
          ← Cancelar
        </button>
      </div>
    </div>
  );
}
