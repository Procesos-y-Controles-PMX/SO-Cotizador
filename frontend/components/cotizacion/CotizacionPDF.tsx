"use client";

import { useCallback, useState } from "react";
import {
  Document,
  Image,
  Page,
  PDFViewer,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { normalizeIvaPct, type IvaPct } from "@/lib/cotizacion/calcImportes";
import type { CotizacionWithRelations } from "@/lib/queries/cotizaciones";
import { money } from "@/lib/utils";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-MX");
}

function pdfFileNameFromFolio(folio: string): string {
  const safe = folio.replace(/[^\w.-]+/g, "_");
  return `${safe}.pdf`;
}

/** Marca Promexma / Cemex (PDF) */
const BRAND_RED = "#DA291C";
const BRAND_GRAY = "#54565A";
const TEXT_BLACK = "#000000";
const TEXT_ON_GRAY = "#FFFFFF";
const BORDER_LIGHT = "#D1D3D4";

function pdfIvaCotizacionPct(quote: CotizacionWithRelations): IvaPct {
  return normalizeIvaPct(quote.iva_porcentaje ?? quote.ctz_cotizacion_items[0]?.iva_porcentaje);
}

function puConIvaIncluido(item: { precio_unitario: number; total_item: number; cantidad: number }): number {
  if (item.cantidad > 0) return Number((item.total_item / item.cantidad).toFixed(2));
  return item.precio_unitario;
}

const styles = StyleSheet.create({
  page: {
    fontSize: 9.5,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: TEXT_BLACK,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerLogoWrap: {
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  headerLogo: {
    width: 280,
    height: 46,
    objectFit: "contain",
  },
  headerDivider: {
    borderBottom: `2.5 solid ${BRAND_RED}`,
    marginBottom: 10,
  },
  companyTagline: {
    fontSize: 8.5,
    textAlign: "center",
    color: TEXT_BLACK,
    marginTop: 4,
    marginBottom: 8,
  },
  card: {
    border: `1 solid ${BRAND_GRAY}`,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 9,
    textTransform: "uppercase",
    color: TEXT_BLACK,
    marginBottom: 6,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  infoCol: { width: "50%", paddingHorizontal: 4, marginBottom: 6 },
  infoLabel: { fontSize: 8, color: TEXT_BLACK, marginBottom: 1 },
  infoValue: { fontSize: 9.3, color: TEXT_BLACK, fontWeight: 600 },
  tableBox: { border: `1 solid ${BRAND_GRAY}`, borderRadius: 8, overflow: "hidden", marginBottom: 12 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND_GRAY,
    borderBottom: `1 solid ${BRAND_GRAY}`,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: { fontSize: 7, textTransform: "uppercase", color: TEXT_ON_GRAY, fontWeight: 700 },
  ivaNote: { fontSize: 8, color: TEXT_BLACK, marginBottom: 6 },
  tableRow: { flexDirection: "row", borderBottom: `1 solid ${BORDER_LIGHT}`, paddingVertical: 6, paddingHorizontal: 8 },
  tableRowAlt: { backgroundColor: "#FFFFFF" },
  tableCell: { fontSize: 8.8, color: TEXT_BLACK },
  tableCellRight: { textAlign: "right" },
  tableFooterRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4, marginBottom: 8, paddingRight: 8 },
  totalsCard: {
    width: 220,
    border: `1 solid ${BRAND_GRAY}`,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: BRAND_GRAY,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalLabel: { fontSize: 8.8, color: TEXT_ON_GRAY },
  totalValue: { fontSize: 8.8, color: TEXT_ON_GRAY, fontWeight: 600 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0,
    borderTop: `1 solid ${TEXT_ON_GRAY}`,
    paddingTop: 4,
  },
  grandTotalLabel: { fontSize: 10, fontWeight: 700, color: TEXT_ON_GRAY },
  grandTotalValue: { fontSize: 11, fontWeight: 800, color: TEXT_ON_GRAY },
  termsBox: {
    border: `1 solid ${BRAND_GRAY}`,
    borderRadius: 8,
    padding: 9,
    minHeight: 84,
    marginTop: 2,
  },
  termsTitle: { fontSize: 8.5, textTransform: "uppercase", color: TEXT_BLACK, fontWeight: 700, marginBottom: 6 },
  termsText: { fontSize: 8.2, color: TEXT_BLACK, lineHeight: 1.35, marginBottom: 3 },
  footerNote: {
    marginTop: 10,
    borderTop: `1 solid ${BRAND_GRAY}`,
    paddingTop: 6,
    fontSize: 7.8,
    color: TEXT_BLACK,
    textAlign: "center",
  },
  cuentasPage: {
    fontSize: 9.5,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: TEXT_BLACK,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  cuentasTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: TEXT_BLACK,
    marginBottom: 12,
    textAlign: "center",
  },
  cuentasImageWrap: { width: "100%", alignItems: "center" },
  cuentasImage: { width: 440, objectFit: "contain" },
});

export function CotizacionPDFDocument({
  quote,
  logoSrc,
  cuentasSrc,
}: {
  quote: CotizacionWithRelations;
  logoSrc: string;
  cuentasSrc: string;
}) {
  const ivaPct = pdfIvaCotizacionPct(quote);
  const terminosExtra =
    quote.ctz_sucursales?.terminos_adicionales
      ?.split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0) ?? [];
  const referenciaPago = quote.referencia_pago?.trim() ?? "";
  const ivaNote = quote.mostrar_con_iva
    ? `IVA aplicable a esta cotizacion: ${ivaPct}% (precios capturados con IVA incluido).`
    : `IVA aplicable a esta cotizacion: ${ivaPct}%.`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerLogoWrap}>
          <Image src={logoSrc} style={styles.headerLogo} />
        </View>
        <Text style={styles.companyTagline}>PROVEEDORA MEXICANA DE MATERIALES, S.A. DE C.V.</Text>
        <View style={styles.headerDivider} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos Generales</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Folio</Text>
              <Text style={styles.infoValue}>{quote.folio}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Cliente</Text>
              <Text style={styles.infoValue}>{quote.ctz_clientes?.nombre_cliente ?? "-"}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Fecha</Text>
              <Text style={styles.infoValue}>{formatDate(quote.created_at)}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Obra</Text>
              <Text style={styles.infoValue}>{quote.nombre_obra ?? "-"}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Cotizo</Text>
              <Text style={styles.infoValue}>{quote.ctz_usuarios?.nombre_completo ?? quote.ctz_usuarios?.email ?? "-"}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Sucursal</Text>
              <Text style={styles.infoValue}>{quote.ctz_sucursales?.nombre ?? "-"}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Condiciones de Pago</Text>
              <Text style={styles.infoValue}>{quote.tipo_pago ?? "-"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.ivaNote}>{ivaNote}</Text>

        <View style={styles.tableBox}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: "26%" }]}>Producto</Text>
            <Text style={[styles.tableHeaderText, { width: "7%" }]}>UM</Text>
            <Text style={[styles.tableHeaderText, { width: "7%" }]}>CANT</Text>
            <Text style={[styles.tableHeaderText, { width: "14%" }]}>PU</Text>
            <Text style={[styles.tableHeaderText, { width: "16%" }]}>PU Neto</Text>
            <Text style={[styles.tableHeaderText, { width: "12%" }]}>SUBTOTAL</Text>
            <Text style={[styles.tableHeaderText, { width: "18%", textAlign: "right" }]}>IMPORTE</Text>
          </View>
          {quote.ctz_cotizacion_items.map((item, index) => (
            <View key={item.id} style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
              <Text style={[styles.tableCell, { width: "26%" }]}>{item.descripcion_registro}</Text>
              <Text style={[styles.tableCell, { width: "7%" }]}>{item.unidad_medida ?? "-"}</Text>
              <Text style={[styles.tableCell, { width: "7%" }]}>{item.cantidad}</Text>
              <Text style={[styles.tableCell, { width: "14%" }]}>{money(item.precio_unitario)}</Text>
              <Text style={[styles.tableCell, { width: "16%" }]}>{money(puConIvaIncluido(item))}</Text>
              <Text style={[styles.tableCell, { width: "12%" }]}>{money(item.subtotal_item)}</Text>
              <Text style={[styles.tableCell, styles.tableCellRight, { width: "18%" }]}>{money(item.total_item)}</Text>
            </View>
          ))}

          <View style={styles.tableFooterRow}>
            <View style={styles.totalsCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{money(quote.subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IVA</Text>
                <Text style={styles.totalValue}>{money(quote.iva_total)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{money(quote.total)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.termsBox}>
          <Text style={styles.termsTitle}>Terminos y Condiciones</Text>
          <Text style={styles.termsText}>- Sujeto a disponibilidad de inventario.</Text>
          <Text style={styles.termsText}>- Precio sujeto a cambio sin previo aviso.</Text>
          <Text style={styles.termsText}>- Precios expresados en moneda nacional.</Text>
          {terminosExtra.map((line, i) => (
            <Text key={`term-ex-${i}`} style={styles.termsText}>
              - {line}
            </Text>
          ))}
          {referenciaPago ? (
            <Text style={styles.termsText}>- Referencia de pago: {referenciaPago}</Text>
          ) : null}
        </View>

        <Text style={styles.footerNote}>
          Este documento es de caracter informativo y tiene fines de cotizacion. Uso exclusivo interno de Promexma.
        </Text>
      </Page>

      <Page size="A4" style={styles.cuentasPage}>
        <Text style={styles.cuentasTitle}>Cuentas bancarias</Text>
        <View style={styles.cuentasImageWrap}>
          <Image src={cuentasSrc} style={styles.cuentasImage} />
        </View>
      </Page>
    </Document>
  );
}

const PDF_LOGO_PATH = "/construrama_promexma.png";
const PDF_CUENTAS_PATH = "/Cuentas.png";

function CotizacionPDFDownloadButton({
  quote,
  logoSrc,
  cuentasSrc,
}: {
  quote: CotizacionWithRelations;
  logoSrc: string;
  cuentasSrc: string;
}) {
  const [loading, setLoading] = useState(false);
  const fileName = pdfFileNameFromFolio(quote.folio);

  const handleDownload = useCallback(async () => {
    setLoading(true);
    try {
      const blob = await pdf(
        <CotizacionPDFDocument quote={quote} logoSrc={logoSrc} cuentasSrc={cuentasSrc} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }, [quote, logoSrc, cuentasSrc, fileName]);

  return (
    <button type="button" className="btn-primary" disabled={loading} onClick={() => void handleDownload()}>
      {loading ? "Preparando..." : "Descargar PDF"}
    </button>
  );
}

export function CotizacionPDFPreview({ quote }: { quote: CotizacionWithRelations }) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const logoSrc = origin ? `${origin}${PDF_LOGO_PATH}` : "https://dummyimage.com/880x120/ffffff/0f1a2e&text=Construrama+Promexma";
  const cuentasSrc = origin ? `${origin}${PDF_CUENTAS_PATH}` : "https://dummyimage.com/880x400/e2e8f0/334155&text=Cuentas+bancarias";
  return (
    <div className="space-y-3">
      <CotizacionPDFDownloadButton quote={quote} logoSrc={logoSrc} cuentasSrc={cuentasSrc} />
      <div className="h-[75vh] overflow-hidden rounded-lg border border-slate-200 bg-white">
        <PDFViewer width="100%" height="100%">
          <CotizacionPDFDocument quote={quote} logoSrc={logoSrc} cuentasSrc={cuentasSrc} />
        </PDFViewer>
      </div>
    </div>
  );
}
