import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { fontSize: 8, fontFamily: "Helvetica", padding: 30, color: "#000" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  companyName: { fontSize: 13, fontWeight: "bold" },
  bold: { fontWeight: "bold" },
  divider: { borderBottomWidth: 1, borderColor: "#000", marginVertical: 4 },
  twoCol: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  col: { width: "48%" },
  poTitle: { fontSize: 11, fontWeight: "bold", textAlign: "center", marginVertical: 6, textDecoration: "underline" },
  tableHeader: { flexDirection: "row", backgroundColor: "#5060AB", padding: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#ccc", padding: 4, minHeight: 20 },
  tableRowAlt: { flexDirection: "row", backgroundColor: "#f5f5f5", borderBottomWidth: 0.5, borderColor: "#ccc", padding: 4, minHeight: 20 },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderColor: "#000" },
  totalLabel: { width: "30%", fontWeight: "bold", textAlign: "right", paddingRight: 8 },
  totalValue: { width: "15%", fontWeight: "bold", textAlign: "right" },
  signatureBlock: { marginTop: 20, alignItems: "flex-end" },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, borderTopWidth: 1, borderColor: "#000", paddingTop: 6 },
  footerCol: { width: "48%" },
  footerLine: { marginBottom: 3 },
});

type VendorData = {
  name: string;
  address?: string | null;
  gstin?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  payment_terms?: string | null;
};


type LineItemData = {
  name: string;
  serial_id?: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
  total?: number;
  custom_note?: string;
};

type DispatchData = {
  delivery?: string;
  inspection?: string;
  mode_of_dispatch?: string;
  place_of_delivery?: string;
  taxes?: string;
  pf_mode?: string;
  pf_value?: number;
};

type POData = {
  po_number: string;
  created_at: string;
  subtotal: number;
  total: number;
  notes?: string | null;
  line_items: LineItemData[] | unknown;
  dispatch_meta?: DispatchData | Record<string, string> | null;
  vendors?: VendorData | null;
};

export function POPdfDocument({ po }: { po: POData }) {
  const dispatch = (po.dispatch_meta ?? {}) as DispatchData & Record<string, string>;
  const lineItems = (po.line_items ?? []) as LineItemData[];
  const vendor = po.vendors;
  const pfAmount = po.total - po.subtotal;

  const date = new Date(po.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ width: "60%" }}>
            <Text style={styles.companyName}>VITON ENGINEERS PVT. LTD.</Text>
            <Text style={{ marginTop: 2, fontSize: 7 }}>
              OFFICE: 701, 7th Floor, Swastik Disa Corporate Park, LBS Marg, Ghatkopar W, Mumbai - 400086
            </Text>
            <Text style={{ marginTop: 1, fontSize: 7 }}>
              WORKS: B401, Addl. Ambernath MIDC, Anand Nagar, Ambernath East, Dist. Thane - 421506
            </Text>
          </View>
          <View style={{ width: "38%", alignItems: "flex-end" }}>
            <Text>Tel: 08779301215 / 9769639388</Text>
            <Text>Email: info@vitonvalves.com</Text>
            <Text style={{ marginTop: 3 }}>GSTIN: 27AACCV7755N1ZK</Text>
          </View>
        </View>

        <View style={styles.divider} />
        <Text style={styles.poTitle}>PURCHASE ORDER</Text>

        {/* Vendor + PO Meta */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.bold}>TO,</Text>
            <Text style={[styles.bold, { fontSize: 10 }]}>{vendor?.name ?? "—"}</Text>
            {vendor?.address ? <Text style={{ marginTop: 2 }}>{vendor.address}</Text> : null}
            {vendor?.gstin ? <Text>GSTIN: {vendor.gstin}</Text> : null}
            {vendor?.contact_name ? <Text style={{ marginTop: 3 }}>Kind Attn: {vendor.contact_name}</Text> : null}
            {vendor?.contact_phone ? <Text>Tel: {vendor.contact_phone}</Text> : null}
          </View>
          <View style={[styles.col, { alignItems: "flex-end" }]}>
            <Text style={styles.bold}>PO NO.: {po.po_number}</Text>
            <Text style={{ marginTop: 3 }}>DATE: {date}</Text>
            {vendor?.payment_terms ? <Text style={{ marginTop: 3 }}>Payment: {vendor.payment_terms}</Text> : null}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={{ width: "6%", color: "#fff", fontWeight: "bold" }}>SR.</Text>
          <Text style={{ width: "16%", color: "#fff", fontWeight: "bold" }}>SERIAL ID</Text>
          <Text style={{ width: "38%", color: "#fff", fontWeight: "bold" }}>PARTICULARS</Text>
          <Text style={{ width: "10%", color: "#fff", fontWeight: "bold", textAlign: "right" }}>QTY.</Text>
          <Text style={{ width: "15%", color: "#fff", fontWeight: "bold", textAlign: "right" }}>RATE (Rs.)</Text>
          <Text style={{ width: "15%", color: "#fff", fontWeight: "bold", textAlign: "right" }}>TOTAL (Rs.)</Text>
        </View>

        {/* Line Items */}
        {lineItems.map((item, i) => (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={{ width: "6%", color: "#999" }}>{i + 1}</Text>
            <Text style={{ width: "16%", fontSize: 7, color: "#3a4a8a" }}>
              {item.serial_id ?? ""}
            </Text>
            <View style={{ width: "38%" }}>
              <Text>{item.name}</Text>
              {item.custom_note ? (
                <Text style={{ color: "#666", fontSize: 7, marginTop: 1 }}>↳ {item.custom_note}</Text>
              ) : null}
            </View>
            <Text style={{ width: "10%", textAlign: "right" }}>
              {item.quantity} {item.unit ?? ""}
            </Text>
            <Text style={{ width: "15%", textAlign: "right" }}>
              {item.unit_price ? item.unit_price.toLocaleString("en-IN") : "—"}
            </Text>
            <Text style={{ width: "15%", textAlign: "right", fontWeight: "bold" }}>
              {item.total ? item.total.toLocaleString("en-IN") : "—"}
            </Text>
          </View>
        ))}

        {/* Totals */}
        {pfAmount > 0 && (
          <View style={[styles.totalRow, { borderTopWidth: 0, marginTop: 1 }]}>
            <Text style={styles.totalLabel}>SUBTOTAL:</Text>
            <Text style={styles.totalValue}>Rs. {po.subtotal.toLocaleString("en-IN")}</Text>
          </View>
        )}
        {pfAmount > 0 && (
          <View style={[styles.totalRow, { borderTopWidth: 0, marginTop: 1 }]}>
            <Text style={styles.totalLabel}>P&F:</Text>
            <Text style={styles.totalValue}>Rs. {pfAmount.toLocaleString("en-IN")}</Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { fontSize: 10 }]}>TOTAL:</Text>
          <Text style={[styles.totalValue, { fontSize: 10 }]}>Rs. {po.total.toLocaleString("en-IN")}</Text>
        </View>

        {/* Notes */}
        {po.notes ? (
          <View style={{ marginTop: 8, padding: 6, backgroundColor: "#f0f2ff", borderRadius: 3 }}>
            <Text style={styles.bold}>Notes:</Text>
            <Text style={{ marginTop: 2, color: "#444" }}>{po.notes}</Text>
          </View>
        ) : null}

        {/* Signature */}
        <View style={styles.signatureBlock}>
          <Text style={styles.bold}>FOR VITON ENGINEERS PVT. LTD.</Text>
          <View style={{ marginTop: 30 }}>
            <Text>______________________________</Text>
            <Text style={{ textAlign: "center", marginTop: 2 }}>Authorised Signatory</Text>
          </View>
        </View>

        {/* Footer Terms */}
        <View style={styles.footer}>
          <View style={styles.footerCol}>
            <Text style={styles.footerLine}>
              <Text style={styles.bold}>DELIVERY: </Text>{dispatch.delivery ?? "Urgent"}
            </Text>
            <Text style={styles.footerLine}>
              <Text style={styles.bold}>MODE OF DESPATCH: </Text>{dispatch.mode_of_dispatch ?? "—"}
            </Text>
            <Text style={styles.footerLine}>
              <Text style={styles.bold}>PLACE OF DELIVERY: </Text>{dispatch.place_of_delivery ?? "Ambernath Works"}
            </Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerLine}>
              <Text style={styles.bold}>INSPECTION: </Text>{dispatch.inspection ?? "By Viton at our works"}
            </Text>
            <Text style={styles.footerLine}>
              <Text style={styles.bold}>P&F: </Text>
              {pfAmount > 0 ? `Rs. ${pfAmount.toLocaleString("en-IN")}` : "Nil"}
            </Text>
            <Text style={styles.footerLine}>
              <Text style={styles.bold}>TAXES: </Text>{dispatch.taxes ?? "At Actual"}
            </Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
