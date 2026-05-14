import {
  Document,
  Image,
  Page,
  PDFDownloadLink,
  PDFViewer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { CotizacionWithRelations } from "@/lib/queries/cotizaciones";

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-MX");
}

function pdfIvaCotizacionPct(quote: CotizacionWithRelations): number {
  const h = quote.iva_porcentaje;
  const hn = Math.round(Number(h));
  if (hn === 0 || hn === 8 || hn === 16) return hn;
  const fromItem = quote.ctz_cotizacion_items[0]?.iva_porcentaje;
  const n = Math.round(Number(fromItem));
  if (n === 0 || n === 8 || n === 16) return n;
  return 16;
}

const styles = StyleSheet.create({
  page: {
    fontSize: 9.5,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerLogoWrap: {
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLogo: {
    width: 440,
    height: 72,
    objectFit: "contain",
  },
  topBar: {
    backgroundColor: "#B91C1C",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  topBarRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  topBarTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: 700 },
  topBarSubtitle: { color: "#FEE2E2", fontSize: 9 },
  folioBadge: {
    border: "1 solid #FCA5A5",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 700,
  },
  companyTagline: {
    fontSize: 8.5,
    textAlign: "center",
    color: "#64748B",
    marginTop: 4,
    marginBottom: 10,
  },
  card: {
    border: "1 solid #E2E8F0",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 9,
    textTransform: "uppercase",
    color: "#94A3B8",
    marginBottom: 6,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  infoCol: { width: "50%", paddingHorizontal: 4, marginBottom: 6 },
  infoLabel: { fontSize: 8, color: "#64748B", marginBottom: 1 },
  infoValue: { fontSize: 9.3, color: "#0F172A", fontWeight: 600 },
  tableBox: { border: "1 solid #E2E8F0", borderRadius: 8, overflow: "hidden", marginBottom: 12 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottom: "1 solid #E2E8F0",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: { fontSize: 8, textTransform: "uppercase", color: "#64748B", fontWeight: 700 },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #EEF2F7", paddingVertical: 6, paddingHorizontal: 8 },
  tableRowAlt: { backgroundColor: "#FCFDFE" },
  tableCell: { fontSize: 8.8, color: "#0F172A" },
  tableCellRight: { textAlign: "right" },
  tableFooterRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4, marginBottom: 8, paddingRight: 8 },
  totalsCard: {
    width: 220,
    border: "1 solid #FECACA",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FEF2F2",
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalLabel: { fontSize: 8.8, color: "#7F1D1D" },
  totalValue: { fontSize: 8.8, color: "#7F1D1D", fontWeight: 600 },
  grandTotalLabel: { fontSize: 10, fontWeight: 700, color: "#991B1B" },
  grandTotalValue: { fontSize: 11, fontWeight: 800, color: "#991B1B" },
  termsGrid: { flexDirection: "row", marginTop: 2 },
  termsColLeft: {
    width: "52%",
    border: "1 solid #E2E8F0",
    borderRadius: 8,
    padding: 9,
    minHeight: 84,
    marginRight: 8,
  },
  termsColRight: {
    width: "48%",
    border: "1 solid #E2E8F0",
    borderRadius: 8,
    padding: 9,
    minHeight: 84,
  },
  termsTitle: { fontSize: 8.5, textTransform: "uppercase", color: "#64748B", fontWeight: 700, marginBottom: 6 },
  termsText: { fontSize: 8.2, color: "#334155", lineHeight: 1.35, marginBottom: 3 },
  footerNote: {
    marginTop: 10,
    borderTop: "1 solid #E2E8F0",
    paddingTop: 6,
    fontSize: 7.8,
    color: "#64748B",
    textAlign: "center",
  },
  cuentasPage: {
    fontSize: 9.5,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  cuentasTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0F172A",
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerLogoWrap}>
          <Image src={logoSrc} style={styles.headerLogo} />
        </View>
        <Text style={styles.companyTagline}>
          PROVEEDORA MEXICANA DE MATERIALES, S.A. DE C.V. · Cotizador interno para uso comercial
        </Text>

        <View style={styles.topBar}>
          <View style={styles.topBarRow}>
            <View>
              <Text style={styles.topBarTitle}>Cotizacion Comercial</Text>
              <Text style={styles.topBarSubtitle}>Sistema Integral de Cotizaciones</Text>
            </View>
            <Text style={styles.folioBadge}>FOLIO {quote.folio}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos Generales</Text>
          <View style={styles.infoGrid}>
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

        <View style={styles.tableBox}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: "43%" }]}>Producto</Text>
            <Text style={[styles.tableHeaderText, { width: "9%" }]}>Cant.</Text>
            <Text style={[styles.tableHeaderText, { width: "14%" }]}>P.U. (neto)</Text>
            <Text style={[styles.tableHeaderText, { width: "8%" }]}>IVA</Text>
            <Text style={[styles.tableHeaderText, { width: "11%" }]}>Subtotal</Text>
            <Text style={[styles.tableHeaderText, { width: "15%", textAlign: "right" }]}>Importe</Text>
          </View>
          {quote.ctz_cotizacion_items.map((item, index) => (
            <View key={item.id} style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
              <Text style={[styles.tableCell, { width: "43%" }]}>{item.descripcion_registro}</Text>
              <Text style={[styles.tableCell, { width: "9%" }]}>{item.cantidad}</Text>
              <Text style={[styles.tableCell, { width: "14%" }]}>{money(item.precio_unitario)}</Text>
              <Text style={[styles.tableCell, { width: "8%" }]}>{ivaPct}%</Text>
              <Text style={[styles.tableCell, { width: "11%" }]}>{money(item.subtotal_item)}</Text>
              <Text style={[styles.tableCell, styles.tableCellRight, { width: "15%" }]}>{money(item.total_item)}</Text>
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
              <View style={[styles.totalRow, { marginBottom: 0, borderTop: "1 solid #FCA5A5", paddingTop: 4 }]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{money(quote.total)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.termsGrid}>
          <View style={styles.termsColLeft}>
            <Text style={styles.termsTitle}>Terminos y Condiciones</Text>
            <Text style={styles.termsText}>- Sujeto a disponibilidad de inventario.</Text>
            <Text style={styles.termsText}>- Precio sujeto a cambio sin previo aviso.</Text>
            <Text style={styles.termsText}>- Precios expresados en moneda nacional.</Text>
            <Text style={styles.termsText}>
              - Pregunte su referencia de pago a su asesor comercial antes de hacer su depósito/transferencia.
            </Text>
            {terminosExtra.map((line, i) => (
              <Text key={`term-ex-${i}`} style={styles.termsText}>
                - {line}
              </Text>
            ))}
          </View>
          <View style={styles.termsColRight}>
            <Text style={styles.termsTitle}>Observaciones</Text>
            <Text style={styles.termsText}>
              {quote.comentarios?.trim()
                ? quote.comentarios
                : "Este documento es informativo y no representa un comprobante de entrega o cobro."}
            </Text>
            <Text style={[styles.termsTitle, { marginTop: 6, marginBottom: 4 }]}>Referencia de Pago</Text>
            <Text style={styles.termsText}>{quote.referencia_pago ?? "Sin referencia especificada."}</Text>
          </View>
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

export function CotizacionPDFPreview({ quote }: { quote: CotizacionWithRelations }) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const logoSrc = origin ? `${origin}${PDF_LOGO_PATH}` : "https://dummyimage.com/880x120/ffffff/0f1a2e&text=Construrama+Promexma";
  const cuentasSrc = origin ? `${origin}${PDF_CUENTAS_PATH}` : "https://dummyimage.com/880x400/e2e8f0/334155&text=Cuentas+bancarias";
  return (
    <div className="space-y-3">
      <PDFDownloadLink
        document={<CotizacionPDFDocument quote={quote} logoSrc={logoSrc} cuentasSrc={cuentasSrc} />}
        fileName={`${quote.folio}.pdf`}
      >
        {({ loading }) => <button className="btn-primary">{loading ? "Preparando..." : "Descargar PDF"}</button>}
      </PDFDownloadLink>
      <div className="h-[75vh] overflow-hidden rounded-lg border border-slate-200 bg-white">
        <PDFViewer width="100%" height="100%">
          <CotizacionPDFDocument quote={quote} logoSrc={logoSrc} cuentasSrc={cuentasSrc} />
        </PDFViewer>
      </div>
    </div>
  );
}
