"use client";

import { useState } from "react";

export default function ImportSpain() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
    setMsg("");
  };

  const handleImport = async () => {
    if (!file) {
      alert("Selecciona un archivo CSV.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const text = await file.text();
      const res = await fetch("/api/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text, // ⚠️ si tu import-csv recibe JSON, puede requerir envoltorio
      });

      const out = await res.json();
      setMsg(
        res.ok
          ? `Importación completada ✔️\nPOs: ${out.ok}  | Errores: ${out.errores}`
          : `❌ Error: ${out.error}`
      );
    } catch (err: any) {
      setMsg("❌ Error procesando archivo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="block border p-2 rounded w-full"
      />

      <button
        onClick={handleImport}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
      >
        {loading ? "Importando..." : "Importar CSV España"}
      </button>

      {msg && (
        <pre className="bg-gray-100 border p-3 rounded text-sm whitespace-pre-wrap">
          {msg}
        </pre>
      )}
    </div>
  );
}
