"use client";

import { useRouter } from "next/navigation";
import CotizacionForm from "@/components/cotizacion/CotizacionForm";

export default function NuevaCotizacionPage() {
  const router = useRouter();

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-slate-900">Nueva cotizacion</h2>
      <CotizacionForm mode="create" onSaved={(id) => router.push(`/cotizaciones/${id}`)} />
    </section>
  );
}

