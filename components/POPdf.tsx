import {
  Document, Page, Text, View, StyleSheet, Font
} from "@react-pdf/renderer";

Font.register({
  family: "Helvetica",
});

const styles = StyleSheet.create({
  page: {
    fontSize: 8,
    fontFamily: "Helvetica",
    padding: 30,
    color: "#000",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  companyName: {
    fontSize: 13,
    fontWeight: "bold",
  },
  bold: { fontWeight: "bold" },
  divider: {
    borderBottomWidth: 1,
    borderColor: "#000",
    marginVertical: 4,
  },
  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  col: { width: "48%" },
  poTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 6,
    textDecoration: "underline",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e3a5f",
    color: "#fff",
    padding: 4,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#ccc",
    padding: 4,
    minHeight: 20,
  },
  tableRowAlt: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 0.5,
    borderColor: "#ccc",
    padding: 4,
    minHeight: 20,
  },
  colNo: { width: "6%" },
  colDesc: { width: "54%" },
  colQty: { width: "12%", textAlign: "right" },
  colRate: { width: "14%", textAlign: "right" },
  colTotal: { width: "14%", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderColor: "#000",
  },
  totalLabel: { width: "28%", fontWeight: "bold", textAlign: "right", paddingRight: 8 },
  totalValue: { width: "14%", fontWeight: "bold", textAlign: "right" },
  signatureBlock: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: "#000",
    paddingTop: 6,
  },
  footerCol: { width: "48%" },
  footerLine: { marginBottom: 3 },
});

type LineItem = {
  description: string;
  qty: number;
  unit?: string;
  rate?: number;
  total?: number;
  notes?: string;
};

type DispatchMeta = {
  delivery?: string;
  mode_of_despatch?: string;
  place_of_delivery?: string;
  payment?: string;
  inspection?: string;
  packing_forwarding?: string;
  taxes?: string;
  your_quot_no?: string;
  quot_date?: string;
  kind_attn?: string;
};

type POData = {
  po_number: string;
  created_at: string;
  subtotal: number;
  total: number;
  notes?: string;
  line_items: LineItem[];
  dispatch_meta?: DispatchMeta;
  vendor?: {
    name: string;
    address?: string;
    city?: string;
    contact_person?: string;
  };
};

export function POPdfDocument({ po }: { po: POData }) {
  const meta: DispatchMeta = po.dispatch_meta || {};
  const date = new Date(po.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Company Header */}
        <View style={styles.headerRow}>
          <View style={{ width: "60%" }}>
            <Text style={styles.companyName}>VITON ENGINEERS PVT. LTD.</Text>
            <Text style={{ marginTop: 2 }}>
              OFFICE: 701, 7th Floor, Swastik Disa Corporate Park,{"\n"}
              Opp. Shreyas Cinema, LBS Marg, Ghatkopar (W), Mumbai - 400086
            </Text>
            <Text style={{ marginTop: 2 }}>
              WORKS: B401, Addl. Ambernath MIDC, Anand Nagar,{"\n"}
              Ambernath East, Dist. Thane - 421506
            </Text>
          </View>
          <View style={{ width: "38%", alignItems: "flex-end" }}>
            <Text>Tel: 08779301215</Text>
            <Text>E-mail: info@vitonvalves.com</Text>
            <Text style={{ marginTop: 4 }}>GST: 27AACCV7755N1ZK</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.poTitle}>PURCHASE ORDER</Text>

        {/* Vendor + PO Details */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.bold}>TO,</Text>
            <Text style={styles.bold}>{po.vendor?.name || ""}</Text>
            {po.vendor?.address && <Text>{po.vendor.address}</Text>}
            {po.vendor?.city && <Text>{po.vendor.city}</Text>}
            {meta.kind_attn && (
              <Text style={{ marginTop: 4 }}>Kind Attn: {meta.kind_attn}</Text>
            )}
          </View>
          <View style={[styles.col, { alignItems: "flex-end" }]}>
            <Text style={styles.bold}>PURCHASE ORDER NO.: {po.po_number}</Text>
            <Text style={{ marginTop: 4 }}>DATE: {date}</Text>
            {meta.your_quot_no && <Text>Your Quot. No.: {meta.your_quot_no}</Text>}
            {meta.quot_date && <Text>Quot. Date: {meta.quot_date}</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Line Items Table */}
        <View style={styles.tableHeader}>
          <Text style={styles.colNo}>SR.</Text>
          <Text style={styles.colDesc}>PARTICULARS</Text>
          <Text style={styles.colQty}>QTY.</Text>
          <Text style={styles.colRate}>UNIT RATE (₹)</Text>
          <Text style={styles.colTotal}>TOTAL (₹)</Text>
        </View>

        {po.line_items.map((item, i) => (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={styles.colNo}>{i + 1}</Text>
            <View style={{ width: "54%" }}>
              <Text>{item.description}</Text>
              {item.notes && (
                <Text style={{ color: "#555", fontSize: 7, marginTop: 2 }}>{item.notes}</Text>
              )}
            </View>
            <Text style={styles.colQty}>
              {item.qty} {item.unit || ""}
            </Text>
            <Text style={styles.colRate}>
              {item.rate ? `₹${item.rate.toLocaleString("en-IN")}` : "-"}
            </Text>
            <Text style={styles.colTotal}>
              {item.total ? `₹${item.total.toLocaleString("en-IN")}` : "-"}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>SUBTOTAL:</Text>
          <Text style={styles.totalValue}>₹{po.subtotal.toLocaleString("en-IN")}</Text>
        </View>
        <View style={[styles.totalRow, { borderTopWidth: 0, marginTop: 2 }]}>
          <Text style={[styles.totalLabel, { fontSize: 10 }]}>TOTAL:</Text>
          <Text style={[styles.totalValue, { fontSize: 10 }]}>₹{po.total.toLocaleString("en-IN")}</Text>
        </View>

        {po.notes && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.bold}>Notes:</Text>
            <Text>{po.notes}</Text>
          </View>
        )}

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
              <Text style={styles.bold}>DELIVERY: </Text>
              {meta.delivery || "Urgent"}
            </Text>
            <Text style={styles.footerLine}>
              <Text style={styles.bold}>MODE OF DESPATCH: </Text>
              {meta.mode_of_despatch || ""}
            </Text>
            <Text style={styles.footerLine}>
              <Text style={styles.bold}>PLACE OF DELIVERY: </Text>
              {meta.place_of_delivery || "Ambernath Works"}
            </Text>
            <Text style={styles.footerLine}>
              <Text style={styles.bold}>PAYMENT: </Text>
              {meta.payment || "60 Days"}
            </Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerLine}>
              <Text style={styles.bold}>INSPECTION: </Text>
              {meta.inspection || "By Viton at our works"}
            </Text>
            <Text style={styles.footerLine}>
              <Text style={styles.bold}>PACKING & FORWARDING: </Text>
              {meta.packing_forwarding || "Nil"}
            </Text>
            <Text style={styles.footerLine}>
              <Text style={styles.bold}>GST NO.: </Text>27AACCV7755N1ZK
            </Text>
            <Text style={styles.footerLine}>
              <Text style={styles.bold}>TAXES: </Text>
              {meta.taxes || "At Actual"}
            </Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
