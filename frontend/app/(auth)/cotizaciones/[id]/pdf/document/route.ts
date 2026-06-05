import {
  buildPdfContentDisposition,
  pdfFileNameFromFolio,
  renderCotizacionPdfBuffer,
} from "@/lib/pdf/cotizacionPdf";
import { getCotizacionById } from "@/lib/queries/cotizaciones";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const quote = await getCotizacionById(id);
  if (!quote) {
    return new Response("Not found", { status: 404 });
  }

  const fileName = pdfFileNameFromFolio(quote.folio);
  const origin = new URL(request.url).origin;
  const buffer = await renderCotizacionPdfBuffer(quote, origin);

  const download = new URL(request.url).searchParams.get("download") === "1";
  const disposition = buildPdfContentDisposition(fileName, download ? "attachment" : "inline");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-cache",
    },
  });
}
