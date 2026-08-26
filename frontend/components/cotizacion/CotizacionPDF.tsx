"use client";

import { useState } from "react";
import { BTN_PRIMARY } from "@/components/ui/contentStyles";
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
      <a href={downloadUrl} download={fileName} className={BTN_PRIMARY}>
        Descargar PDF
      </a>
      <div className="relative h-[75vh] overflow-hidden rounded-lg border border-line bg-card">
        {loadError ? (
          <p className="flex h-full items-center justify-center text-sm text-fg-subtle">No se pudo cargar el PDF.</p>
        ) : (
          <>
            {loading ? (
              <p className="absolute inset-0 z-10 flex items-center justify-center bg-card text-sm text-fg-subtle">
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
