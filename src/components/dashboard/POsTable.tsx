"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PO } from "@/types";
import { getEstadoPO } from "@/utils/getEstadoPO";

export default function POsTable({ pos }: { pos: PO[] }) {
  const router = useRouter();

  async function handleDelete(poId: string, poNumber?: string | null) {
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar este PO${
        poNumber ? ` (${poNumber})` : ""
      }?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    const response = await fetch(`/api/po/${poId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("No se ha podido eliminar el PO.");
      return;
    }

    router.refresh();
    window.location.reload();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Purchase Orders</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>PO Date</TableHead>
                <TableHead>ETD PI</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {pos.length > 0 ? (
                pos.map((po: any) => {
                  const estado = getEstadoPO(po);

                  return (
                    <TableRow key={po.id}>
                      <TableCell>{po.po}</TableCell>
                      <TableCell>{po.supplier}</TableCell>
                      <TableCell>{po.customer}</TableCell>
                      <TableCell>{po.factory}</TableCell>
                      <TableCell>{po?.season || "-"}</TableCell>
                      <TableCell>{po.po_date || "-"}</TableCell>
                      <TableCell>{po.etd_pi || "-"}</TableCell>

                      <TableCell className="font-semibold">
                        {estado.icon} {estado.estado}
                      </TableCell>

                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/po/${po.id}/editar`}>
                            <Button size="sm" variant="outline">
                              Editar
                            </Button>
                          </Link>

                          <Link href={`/po/${po.id}`}>
                            <Button size="sm" variant="ghost">
                              Ver
                            </Button>
                          </Link>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(po.id, po.po)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="py-4 text-center">
                    No hay resultados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}