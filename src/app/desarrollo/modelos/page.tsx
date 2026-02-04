"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Modelo = {
  id: string;
  style: string;
  reference?: string | null;
  customer?: string | null;
  supplier?: string | null;
  factory?: string | null;
  status: string;
};

export default function ModelosList() {
  const [items, setItems] = useState<Modelo[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [q, setQ] = useState("");
  const [supplier, setSupplier] = useState("");
  const [customer, setCustomer] = useState("");
  const [factory, setFactory] = useState("");
  const [status, setStatus] = useState("");

  // dropdown options
  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [factoryOptions, setFactoryOptions] = useState<string[]>([]);

  // paginación
  const limit = 20;
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  async function loadFilters() {
    const res = await fetch("/api/modelos-filters");
    const json = await res.json();
    setSupplierOptions(json.suppliers || []);
    setCustomerOptions(json.customers || []);
    setFactoryOptions(json.factories || []);
  }

  async function loadModelos(resetOffset = false) {
    setLoading(true);

    const realOffset = resetOffset ? 0 : offset;
    if (resetOffset) setOffset(0);

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (supplier) params.set("supplier", supplier);
    if (customer) params.set("customer", customer);
    if (factory) params.set("factory", factory);
    if (status) params.set("status", status);
    params.set("limit", String(limit));
    params.set("offset", String(realOffset));

    const res = await fetch(`/api/modelos?${params.toString()}`);
    const json = await res.json();

    setItems(json.data || []);
    setTotal(json.count || 0);
    setLoading(false);
  }

  // carga inicial
  useEffect(() => {
    loadFilters();
    loadModelos(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // paginación
  useEffect(() => {
    loadModelos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  function applyFilters() {
    loadModelos(true);
  }

  function clearFilters() {
    setQ("");
    setSupplier("");
    setCustomer("");
    setFactory("");
    setStatus("");
    setOffset(0);
    // recargar lista limpia
    setTimeout(() => loadModelos(true), 0);
  }

  function nextPage() {
    if (offset + limit < total) setOffset(offset + limit);
  }

  function prevPage() {
    if (offset > 0) setOffset(Math.max(0, offset - limit));
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-2xl font-bold">📚 Modelos</h1>

        <div className="flex gap-2">
          <Link
            href="/desarrollo/modelos/nuevo"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition text-sm"
          >
            ➕ Nuevo modelo
          </Link>

          <Link
            href="/desarrollo"
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition text-sm"
          >
            ← Volver
          </Link>
        </div>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        <input
          type="text"
          placeholder="Buscar style / reference"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border px-3 py-2 rounded"
        />

        <select
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">Supplier</option>
          {supplierOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">Customer</option>
          {customerOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={factory}
          onChange={(e) => setFactory(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">Factory</option>
          {factoryOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">Status</option>
          <option value="desarrollo">Desarrollo</option>
          <option value="activo">Activo</option>
          <option value="en_fabricacion">En fabricación</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <button
          onClick={applyFilters}
          className="bg-black text-white rounded px-4 py-2"
        >
          Aplicar
        </button>

        <button
          onClick={clearFilters}
          className="border rounded px-4 py-2"
        >
          Limpiar
        </button>
      </div>

      {/* TABLA */}
      {loading ? (
        <div className="text-gray-600">Cargando…</div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3">Style</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Supplier</th>
                <th className="text-left p-3">Factory</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-3 font-semibold">{m.style}</td>
                  <td className="p-3">{m.customer || "-"}</td>
                  <td className="p-3">{m.supplier || "-"}</td>
                  <td className="p-3">{m.factory || "-"}</td>
                  <td className="p-3">{m.status}</td>
                  <td className="p-3">
                    <Link
                      href={`/desarrollo/modelos/${m.id}`}
                      className="px-3 py-1 rounded bg-black text-white hover:bg-gray-800"
                    >
                      Ver ficha
                    </Link>
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    No hay modelos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINACIÓN */}
      <div className="flex justify-between items-center text-sm">
        <span>
          {total === 0 ? "0–0 de 0" : `${offset + 1}–${Math.min(offset + limit, total)} de ${total}`}
        </span>

        <div className="space-x-2">
          <button
            onClick={prevPage}
            disabled={offset === 0}
            className="border px-3 py-1 rounded disabled:opacity-50"
          >
            ← Anterior
          </button>
          <button
            onClick={nextPage}
            disabled={offset + limit >= total}
            className="border px-3 py-1 rounded disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
