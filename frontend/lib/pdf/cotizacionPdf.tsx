import { pdf, renderToBuffer } from "@react-pdf/renderer";
import { CotizacionPDFDocument } from "@/lib/pdf/CotizacionPDFDocument";
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

export function buildPdfContentDisposition(
  fileName: string,
  mode: "inline" | "attachment"
): string {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(fileName);
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

function pdfAssetUrls(origin?: string): { logoSrc: string; cuentasSrc: string } {
  const base = origin || (typeof window === "undefined" ? "" : window.location.origin);
  return {
    logoSrc: base
      ? `${base}${PDF_LOGO_PATH}`
      : "https://dummyimage.com/880x120/ffffff/0f1a2e&text=Construrama+Promexma",
    cuentasSrc: base
      ? `${base}${PDF_CUENTAS_PATH}`
      : "https://dummyimage.com/880x400/e2e8f0/334155&text=Cuentas+bancarias",
  };
}

export async function renderCotizacionPdfBuffer(
  quote: CotizacionWithRelations,
  origin: string
): Promise<Buffer> {
  const { logoSrc, cuentasSrc } = pdfAssetUrls(origin);
  return renderToBuffer(
    <CotizacionPDFDocument quote={quote} logoSrc={logoSrc} cuentasSrc={cuentasSrc} />
  );
}

export async function generateCotizacionPdfBlob(quote: CotizacionWithRelations): Promise<Blob> {
  const { logoSrc, cuentasSrc } = pdfAssetUrls();
  return pdf(<CotizacionPDFDocument quote={quote} logoSrc={logoSrc} cuentasSrc={cuentasSrc} />).toBlob();
}

export function cotizacionPdfDocumentUrl(cotizacionId: string, download = false): string {
  const base = `/cotizaciones/${cotizacionId}/pdf/document`;
  return download ? `${base}?download=1` : base;
}
