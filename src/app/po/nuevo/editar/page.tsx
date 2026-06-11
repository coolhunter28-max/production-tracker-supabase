import { POForm } from "@/components/po/po-form";

export default function NuevoPOPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <POForm successUrl="/produccion/pos" cancelUrl="/produccion/pos" />
    </main>
  );
}