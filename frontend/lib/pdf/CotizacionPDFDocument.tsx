import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { normalizeIvaPct, type IvaPct } from "@/lib/cotizacion/calcImportes";
import { formatTipoPago } from "@/lib/cotizacion/tipoPago";
import { obraLabelCotizacion } from "@/lib/queries/obras";
import type { CotizacionWithRelations } from "@/lib/queries/cotizaciones";
import { formatQuantity, money } from "@/lib/utils";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-MX");
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
    marginBottom: 4,
  },
  headerLogo: {
    width: 360,
    height: 58,
    objectFit: "contain",
  },
  headerDivider: {
    borderBottom: `4 solid ${BRAND_RED}`,
    marginBottom: 10,
  },
  companyTagline: {
    fontSize: 8.5,
    textAlign: "center",
    color: TEXT_BLACK,
    marginTop: 2,
    marginBottom: 6,
  },
  sucursalDireccion: {
    fontSize: 8,
    textAlign: "center",
    color: TEXT_BLACK,
    marginTop: 2,
    marginBottom: 8,
    lineHeight: 1.35,
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
  infoGrid: { flexDirection: "row", width: "100%" },
  infoCol: { width: "33.33%", paddingHorizontal: 6 },
  infoField: { marginBottom: 8 },
  infoLabel: { fontSize: 8, color: TEXT_BLACK, marginBottom: 1, fontWeight: 700 },
  infoValue: { fontSize: 9.3, color: TEXT_BLACK },
  tableBox: { border: `1 solid ${BRAND_GRAY}`, borderRadius: 8, overflow: "hidden", marginBottom: 12 },
  tableTitleBar: {
    backgroundColor: BRAND_RED,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableTitleBarText: {
    fontSize: 8.5,
    textTransform: "uppercase",
    color: TEXT_ON_GRAY,
    fontWeight: 700,
    textAlign: "center",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND_GRAY,
    borderBottom: `1 solid ${BRAND_GRAY}`,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 8.5,
    textTransform: "uppercase",
    color: TEXT_ON_GRAY,
    fontWeight: 700,
    textAlign: "center",
  },
  tableRow: { flexDirection: "row", borderBottom: `1 solid ${BORDER_LIGHT}`, paddingVertical: 4, paddingHorizontal: 8 },
  tableRowAlt: { backgroundColor: "#FFFFFF" },
  tableCell: { fontSize: 7.8, color: TEXT_BLACK, textAlign: "center" },
  tableCellProduct: { fontSize: 7.0, color: TEXT_BLACK, textAlign: "center" },
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
  grandTotalLabel: { fontSize: 8.8, fontWeight: 700, color: TEXT_ON_GRAY },
  grandTotalValue: { fontSize: 8.8, fontWeight: 700, color: TEXT_ON_GRAY },
  termsSection: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  termsTitle: { fontSize: 8.5, textTransform: "uppercase", color: TEXT_BLACK, fontWeight: 700, marginBottom: 6 },
  termsText: { fontSize: 8.2, color: TEXT_BLACK, lineHeight: 1.35, marginBottom: 3 },
  footerNote: {
    marginTop: 10,
    borderTop: `1 solid ${BRAND_GRAY}`,
    paddingTop: 6,
    paddingHorizontal: 12,
    fontSize: 7.5,
    color: TEXT_BLACK,
    textAlign: "center",
    lineHeight: 1.4,
  },
  cuentasSection: {
    marginTop: 12,
    alignItems: "center",
  },
  cuentasTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: TEXT_BLACK,
    marginBottom: 6,
    textAlign: "center",
  },
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
  // Solo snapshots de la cotización — nunca plantilla/dirección viva de la sucursal.
  const terminosExtra =
    quote.terminos_adicionales
      ?.split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0) ?? [];
  const referenciaPago = quote.referencia_pago?.trim() ?? "";
  const sucursalDireccion = quote.direccion_sucursal?.trim() ?? "";

  return (
    <Document title={quote.folio}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerLogoWrap}>
          <Image src={logoSrc} style={styles.headerLogo} />
        </View>
        <Text style={styles.companyTagline}>PROVEEDORA MEXICANA DE MATERIALES, S.A. DE C.V.</Text>
        {sucursalDireccion ? <Text style={styles.sucursalDireccion}>{sucursalDireccion}</Text> : null}
        <View style={styles.headerDivider} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos Generales</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Folio</Text>
                <Text style={styles.infoValue}>{quote.folio}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Cliente</Text>
                <Text style={styles.infoValue}>{quote.ctz_clientes?.nombre_cliente ?? "-"}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Obra</Text>
                <Text style={styles.infoValue}>{obraLabelCotizacion(quote)}</Text>
              </View>
            </View>
            <View style={styles.infoCol}>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Condición de pago</Text>
                <Text style={styles.infoValue}>{formatTipoPago(quote.tipo_pago)}</Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Cotizó</Text>
                <Text style={styles.infoValue}>
                  {quote.ctz_usuarios?.nombre_completo ?? quote.ctz_usuarios?.email ?? "-"}
                </Text>
              </View>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Sucursal</Text>
                <Text style={styles.infoValue}>{quote.ctz_sucursales?.nombre ?? "-"}</Text>
              </View>
            </View>
            <View style={styles.infoCol}>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>Fecha</Text>
                <Text style={styles.infoValue}>{formatDate(quote.created_at)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tableBox}>
          <View style={styles.tableTitleBar}>
            <Text style={styles.tableTitleBarText}>Lista de precios</Text>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: "26%" }]}>PRODUCTO</Text>
            <Text style={[styles.tableHeaderText, { width: "14%" }]}>SKU</Text>
            <Text style={[styles.tableHeaderText, { width: "15%" }]}>UM</Text>
            <Text style={[styles.tableHeaderText, { width: "15%" }]}>CANTIDAD</Text>
            <Text style={[styles.tableHeaderText, { width: "15%" }]}>PU</Text>
            <Text style={[styles.tableHeaderText, { width: "15%" }]}>SUBTOTAL</Text>
          </View>
          {quote.ctz_cotizacion_items.map((producto, index) => (
            <View key={producto.id} style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
              <Text style={[styles.tableCellProduct, { width: "26%" }]}>{producto.descripcion_registro}</Text>
              <Text style={[styles.tableCell, { width: "14%" }]}>{producto.ctz_productos?.sku?.trim() || "-"}</Text>
              <Text style={[styles.tableCell, { width: "15%" }]}>{producto.unidad_medida ?? "-"}</Text>
              <Text style={[styles.tableCell, { width: "15%" }]}>{formatQuantity(producto.cantidad)}</Text>
              <Text style={[styles.tableCell, { width: "15%" }]}>{money(producto.precio_unitario)}</Text>
              <Text style={[styles.tableCell, { width: "15%" }]}>{money(producto.subtotal_item)}</Text>
            </View>
          ))}

          <View style={styles.tableFooterRow}>
            <View style={styles.totalsCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{money(quote.subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IVA ({ivaPct}%)</Text>
                <Text style={styles.totalValue}>{money(quote.iva_total)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{money(quote.total)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Términos y Condiciones</Text>
          <Text style={styles.termsText}>- Sujeto a disponibilidad de inventario.</Text>
          <Text style={styles.termsText}>- Precio sujeto a cambio sin previo aviso.</Text>
          <Text style={styles.termsText}>- Precios indicados son antes de IVA.</Text>
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
          Este documento es únicamente de carácter informativo y tiene fines de cotización. No es un comprobante de
          entrega de material ni recibo de caja para cobranza.
        </Text>

        <View style={styles.cuentasSection}>
          <Text style={styles.cuentasTitle}>Cuentas bancarias</Text>
          <Image src={cuentasSrc} style={styles.cuentasImage} />
        </View>
      </Page>
    </Document>
  );
}
