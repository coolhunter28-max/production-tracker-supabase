"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PoDetailPage from "@/components/PoDetailPage"; // ✅ Importación corregida

export default function PedidoView() {
  const params = useParams();
  const { id } = params as { id: string };
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPo() {
      try {
        const res = await fetch(`/api/po/${id}`);
        if (!res.ok) throw new Error("Error al cargar el PO");
        const data = await res.json();
        setPo(data);
      } catch (err) {
        console.error(err);
        setPo(null);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchPo();
  }, [id]);

  if (loading) return <p className="p-4">Cargando...</p>;
  if (!po) return <p className="p-4">No se encontraron detalles para este PO.</p>;

  return <PoDetailPage po={po} />;
}
