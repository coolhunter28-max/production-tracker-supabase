"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { POForm } from "@/components/po/po-form";

export default function EditarPOPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [po, setPO] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPO() {
      if (!id) return;

      const res = await fetch(`/api/po/${id}`, {
        cache: "no-store",
      });

      const data = await res.json();

      setPO(data);
      setLoading(false);
    }

    loadPO();
  }, [id]);

  if (loading) {
    return <main className="p-8">Cargando PO...</main>;
  }

  if (!po?.id) {
    return <main className="p-8 text-red-600">No se encontró el PO.</main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <POForm
        po={po}
        successUrl={`/po/${po.id}`}
        cancelUrl={`/po/${po.id}`}
      />
    </main>
  );
}