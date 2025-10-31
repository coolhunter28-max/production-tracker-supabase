"use client";
import { useEffect, useState } from "react";
import { analyzeImport } from "@/services/import-csv";

export default function ImportPreview() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: any) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  useEffect(() => {
    if (!file) return;
    analyzeImport(file)
      .then((res: any) => setData(res))
      .catch((err) => setError(err.message));
  }, [file]);

  if (error)
    return (
      <div className="p-4">
        <p className="text-red-600">{error}</p>
        <label className="block mt-3 text-blue-600 underline cursor-pointer">
          Upload new CSV
          <input type="file" hidden onChange={handleFile} accept=".csv" />
        </label>
      </div>
    );

  if (!data)
    return (
      <div className="p-4">
        <label className="block text-blue-600 underline cursor-pointer">
          Upload CSV file
          <input type="file" hidden onChange={handleFile} accept=".csv" />
        </label>
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-2">Import Preview</h1>
      <div className="grid grid-cols-4 gap-3 text-sm">
        <div>Total POs: {data.totalPOs}</div>
        <div className="bg-green-50 p-2 rounded">New POs: {data.newPOs}</div>
        <div className="bg-yellow-50 p-2 rounded">Modified POs: {data.modifiedPOs}</div>
        <div className="bg-blue-50 p-2 rounded">Total lines: {data.totalLines}</div>
      </div>

      <div className="mt-4">
        <label className="text-blue-600 underline cursor-pointer">
          Upload new CSV
          <input type="file" hidden onChange={handleFile} accept=".csv" />
        </label>
      </div>

      {data.data.map((po: any, idx: number) => (
        <div key={idx} className="border rounded-lg bg-yellow-50 p-4 mb-4">
          <div className="flex justify-between font-semibold">
            <span>
              PO {po.po} — {po.supplier} | {po.factory} | {po.customer}
            </span>
            <span>Season: {po.season}</span>
          </div>

          <table className="w-full mt-3 text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th>Style</th>
                <th>Color</th>
                <th>Reference</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {po.lines.map((line: any, i: number) => (
                <tr key={i} className="border-t">
                  <td>{line.style}</td>
                  <td>{line.color}</td>
                  <td>{line.reference}</td>
                  <td>{line.qty}</td>
                  <td>{line.price.toFixed(2)}</td>
                  <td>{line.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
