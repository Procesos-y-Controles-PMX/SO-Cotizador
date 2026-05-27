import { pdf } from "@react-pdf/renderer";
import type { CotizacionWithRelations } from "@/lib/queries/cotizaciones";

const PDF_LOGO_PATH = "/construrama_promexma.png";
const PDF_CUENTAS_PATH = "/Cuentas.png";

export function pdfFileNameFromFolio(folio: string): string {
  const trimmed = folio.trim();
  const safe = (trimmed || "cotizacion").replace(/[^\w.-]+/g, "_");
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
}

export function sanitizeZipPathSegment(name: string): string {
  const trimmed = name.trim();
  const safe = (trimmed || "carpeta").replace(/[^\w.-]+/g, "_");
  return safe || "carpeta";
}

function pdfAssetUrls(): { logoSrc: string; cuentasSrc: string } {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return {
    logoSrc: origin
      ? `${origin}${PDF_LOGO_PATH}`
      : "https://dummyimage.com/880x120/ffffff/0f1a2e&text=Construrama+Promexma",
    cuentasSrc: origin
      ? `${origin}${PDF_CUENTAS_PATH}`
      : "https://dummyimage.com/880x400/e2e8f0/334155&text=Cuentas+bancarias",
  };
}

export async function generateCotizacionPdfBlob(quote: CotizacionWithRelations): Promise<Blob> {
  const { CotizacionPDFDocument } = await import("@/components/cotizacion/CotizacionPDF");
  const { logoSrc, cuentasSrc } = pdfAssetUrls();
  return pdf(<CotizacionPDFDocument quote={quote} logoSrc={logoSrc} cuentasSrc={cuentasSrc} />).toBlob();
}
