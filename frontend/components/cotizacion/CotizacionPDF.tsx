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

const styles = StyleSheet.create({
  page: { fontSize: 10, padding: 24 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  section: { marginBottom: 12 },
  title: { fontSize: 16, marginBottom: 8 },
  tableHeader: { flexDirection: "row", borderBottom: "1 solid #ddd", paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #eee", paddingVertical: 3 },
});

export function CotizacionPDFDocument({
  quote,
  logoSrc,
}: {
  quote: CotizacionWithRelations;
  logoSrc: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Image src={logoSrc} style={{ width: 160, marginBottom: 8 }} />
          <Text style={styles.title}>Cotizacion {quote.folio}</Text>
          <View style={styles.row}>
            <Text>Cliente: {quote.ctz_clientes?.nombre_cliente ?? "-"}</Text>
            <Text>Sucursal: {quote.ctz_sucursales?.nombre ?? "-"}</Text>
          </View>
          <View style={styles.row}>
            <Text>Obra: {quote.nombre_obra ?? "-"}</Text>
            <Text>Pago: {quote.tipo_pago ?? "-"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={{ width: "45%" }}>Descripcion</Text>
            <Text style={{ width: "10%" }}>Cant.</Text>
            <Text style={{ width: "15%" }}>P.U.</Text>
            <Text style={{ width: "10%" }}>IVA</Text>
            <Text style={{ width: "20%", textAlign: "right" }}>Total</Text>
          </View>
          {quote.ctz_cotizacion_items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={{ width: "45%" }}>{item.descripcion_registro}</Text>
              <Text style={{ width: "10%" }}>{item.cantidad}</Text>
              <Text style={{ width: "15%" }}>${item.precio_unitario.toFixed(2)}</Text>
              <Text style={{ width: "10%" }}>{item.iva_porcentaje}%</Text>
              <Text style={{ width: "20%", textAlign: "right" }}>${item.total_item.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text>Subtotal: ${quote.subtotal.toFixed(2)}</Text>
          <Text>IVA: ${quote.iva_total.toFixed(2)}</Text>
          <Text>Total: ${quote.total.toFixed(2)}</Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text>Vigencia: 15 dias naturales desde la fecha de emision.</Text>
          <Text>Capacidad de entrega: sujeta a disponibilidad al momento de confirmar pedido.</Text>
        </View>
      </Page>
    </Document>
  );
}

export function CotizacionPDFPreview({ quote }: { quote: CotizacionWithRelations }) {
  const logoSrc =
    typeof window === "undefined" ? "https://dummyimage.com/320x80/0f1a2e/ffffff&text=Promexma" : `${window.location.origin}/promexma-logo.png`;
  return (
    <div className="space-y-3">
      <PDFDownloadLink
        document={<CotizacionPDFDocument quote={quote} logoSrc={logoSrc} />}
        fileName={`${quote.folio}.pdf`}
      >
        {({ loading }) => <button className="btn-primary">{loading ? "Preparando..." : "Descargar PDF"}</button>}
      </PDFDownloadLink>
      <div className="h-[75vh] overflow-hidden rounded-lg border border-slate-200 bg-white">
        <PDFViewer width="100%" height="100%">
          <CotizacionPDFDocument quote={quote} logoSrc={logoSrc} />
        </PDFViewer>
      </div>
    </div>
  );
}

