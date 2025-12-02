"use client";

import Link from "next/link";
import { PO } from "@/types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function POsTable({ pos }: { pos: PO[] }) {
  return (
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
            pos.map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-medium">{po.po}</TableCell>
                <TableCell>{po.supplier}</TableCell>
                <TableCell>{po.customer}</TableCell>
                <TableCell>{po.factory}</TableCell>
                <TableCell>{(po as any)?.season || "-"}</TableCell>
                <TableCell>{po.po_date || "-"}</TableCell>
                <TableCell>{po.etd_pi || "-"}</TableCell>

                <TableCell>
                  <Badge variant="outline">Activo</Badge>
                </TableCell>

                <TableCell>
                  <div className="flex space-x-2">
                    <Link href={`/po/${po.id}/editar`}>
                      <Button variant="outline" size="sm">Editar</Button>
                    </Link>

                    <Link href={`/po/${po.id}`}>
                      <Button variant="ghost" size="sm">Ver</Button>
                    </Link>
                  </div>
                </TableCell>

              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-4">
                No hay resultados
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
