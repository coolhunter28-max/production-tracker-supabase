"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Package, TrendingUp, Upload, Users } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Stats = {
  totalPedidos: number;
  enProduccion: number;
  pendientes: number;
  completados: number;
};

export function DashboardContent() {
  const [stats, setStats] = useState<Stats>({
    totalPedidos: 0,
    enProduccion: 0,
    pendientes: 0,
    completados: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const fetchData = async () => {
      setLoading(true);

      try {
        const { count: totalPedidos } = await supabase
          .from("pedidos")
          .select("*", { count: "exact", head: true });

        const { count: enProduccion } = await supabase
          .from("pedidos")
          .select("*", { count: "exact", head: true })
          .eq("estado", "en_produccion");

        const { count: pendientes } = await supabase
          .from("pedidos")
          .select("*", { count: "exact", head: true })
          .eq("estado", "pendiente");

        const { count: completados } = await supabase
          .from("pedidos")
          .select("*", { count: "exact", head: true })
          .eq("estado", "completado");

        setStats({
          totalPedidos: totalPedidos ?? 0,
          enProduccion: enProduccion ?? 0,
          pendientes: pendientes ?? 0,
          completados: completados ?? 0,
        });
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const pedidosChannel = supabase
      .channel("pedidos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pedidosChannel);
    };
  }, []);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Production Tracker
          </h1>
          <p className="text-muted-foreground">
            Sistema de seguimiento de producción y gestión de pedidos
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/produccion/pos">
            <Button className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Ver POs
            </Button>
          </Link>

          <Link href="/produccion/import">
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importar Datos
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pedidos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.totalPedidos}
            </div>
            <p className="text-xs text-muted-foreground">
              Pedidos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              En Producción
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.enProduccion}
            </div>
            <p className="text-xs text-muted-foreground">
              Activos actualmente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.pendientes}
            </div>
            <p className="text-xs text-muted-foreground">Por iniciar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.completados}
            </div>
            <p className="text-xs text-muted-foreground">Finalizados</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}