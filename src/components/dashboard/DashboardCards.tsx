import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardCards({
  totalPOs,
  totalCustomers,
  totalSuppliers,
  totalFactories
}: {
  totalPOs: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalFactories: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card>
        <CardHeader><CardTitle>Total POs</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-bold">{totalPOs}</div></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Customers</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-bold">{totalCustomers}</div></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Suppliers</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-bold">{totalSuppliers}</div></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Factories</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-bold">{totalFactories}</div></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>POs Activos</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-bold">{totalPOs}</div></CardContent>
      </Card>
    </div>
  );
}
