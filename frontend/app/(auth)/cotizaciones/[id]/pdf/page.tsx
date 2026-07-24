"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CotizacionPDFPreview } from "@/components/cotizacion/CotizacionPDF";
import { getCotizacionById, type CotizacionWithRelations } from "@/lib/queries/cotizaciones";

export default function CotizacionPdfPage() {
  const params = useParams<{ id: string }>();
  const [quote, setQuote] = useState<CotizacionWithRelations | null>(null);

  useEffect(() => {
    if (!params.id) return;
    getCotizacionById(params.id).then(setQuote);
  }, [params.id]);

  if (!quote) return <p className="text-sm text-fg-subtle">Cargando PDF...</p>;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-fg">Vista previa de PDF</h2>
        <Link
          href={`/cotizaciones/${params.id}`}
          className="rounded-md border border-line-strong bg-card px-4 py-2 text-sm font-medium text-fg-strong shadow-sm transition-colors hover:bg-muted"
        >
          Volver a la cotización
        </Link>
      </div>
      <CotizacionPDFPreview quote={quote} />
    </section>
  );
}

