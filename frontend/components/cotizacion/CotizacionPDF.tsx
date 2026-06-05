"use client";

import { useState } from "react";
import { cotizacionPdfDocumentUrl, pdfFileNameFromFolio } from "@/lib/pdf/cotizacionPdf";
import type { CotizacionWithRelations } from "@/lib/queries/cotizaciones";

export { CotizacionPDFDocument } from "@/lib/pdf/CotizacionPDFDocument";

export function CotizacionPDFPreview({ quote }: { quote: CotizacionWithRelations }) {
  const fileName = pdfFileNameFromFolio(quote.folio);
  const documentUrl = cotizacionPdfDocumentUrl(quote.id);
  const downloadUrl = cotizacionPdfDocumentUrl(quote.id, true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  return (
    <div className="space-y-3">
      <a href={downloadUrl} download={fileName} className="btn-primary inline-block">
        Descargar PDF
      </a>
      <div className="relative h-[75vh] overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loadError ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">No se pudo cargar el PDF.</p>
        ) : (
          <>
            {loading ? (
              <p className="absolute inset-0 z-10 flex items-center justify-center bg-white text-sm text-slate-500">
                Cargando vista previa...
              </p>
            ) : null}
            <iframe
              src={documentUrl}
              title={fileName}
              className="h-full w-full border-0"
              onLoad={() => {
                setLoading(false);
                setLoadError(false);
              }}
              onError={() => {
                setLoading(false);
                setLoadError(true);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
