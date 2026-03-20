import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const S = StyleSheet.create({
  page: { fontSize: 8, fontFamily: "Helvetica", padding: 36, color: "#000" },
  bold: { fontWeight: "bold" },
  divider: { borderBottomWidth: 1, borderColor: "#000", marginVertical: 6 },
  poTitle: { fontSize: 12, fontWeight: "bold", textAlign: "center", marginVertical: 8, textDecoration: "underline" },
  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  col: { width: "48%" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#5060AB", paddingVertical: 5, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#ddd", paddingVertical: 4, paddingHorizontal: 4 },
  tableRowAlt: { flexDirection: "row", backgroundColor: "#f7f7f7", borderBottomWidth: 0.5, borderColor: "#ddd", paddingVertical: 4, paddingHorizontal: 4 },
  noteRow: { flexDirection: "row", paddingLeft: 4, paddingBottom: 3 },
  totalsBlock: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6 },
  totalLabel: { width: "22%", textAlign: "right", paddingRight: 6 },
  totalValue: { width: "14%", textAlign: "right" },
  signatureBlock: { alignItems: "flex-end", marginTop: 24 },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, borderTopWidth: 1, borderColor: "#bbb", paddingTop: 6 },
  footerCol: { width: "48%" },
  footerLine: { marginBottom: 4 },
});

// Column widths — must total 100%
const C = {
  sr:     "5%",
  serial: "20%",
  desc:   "37%",
  qty:    "10%",
  rate:   "14%",
  total:  "14%",
};

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
  const dispatch = (po.dispatch_meta ?? {}) as DispatchData;
  const lineItems = (po.line_items ?? []) as LineItemData[];
  const vendor = po.vendors;
  const pfAmount = po.total - po.subtotal;

  const date = new Date(po.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* Letterhead */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          <View style={{ width: "62%" }}>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>VITON ENGINEERS PVT. LTD.</Text>
            <Text style={{ fontSize: 7, marginTop: 3, lineHeight: 1.5 }}>
              OFFICE: 701, 7th Floor, Swastik Disa Corporate Park, LBS Marg, Ghatkopar W, Mumbai - 400086
            </Text>
            <Text style={{ fontSize: 7, lineHeight: 1.5 }}>
              WORKS: B401, Addl. Ambernath MIDC, Anand Nagar, Ambernath East, Dist. Thane - 421506
            </Text>
            <Text style={{ fontSize: 7, marginTop: 2 }}>
              Tel: 08779301215 / 9769639388  |  Email: info@vitonvalves.com  |  GSTIN: 27AACCV7755N1ZK
            </Text>
          </View>
          <View style={{ width: "35%", alignItems: "flex-end" }}>
            <View style={{ border: "2pt solid #5060AB", borderRadius: 4, padding: "6 10" }}>
              <Text style={{ fontSize: 7, color: "#999", textTransform: "uppercase", letterSpacing: 1 }}>Purchase Order</Text>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#5060AB", marginTop: 2 }}>{po.po_number}</Text>
            </View>
            <Text style={{ fontSize: 8, color: "#555", marginTop: 4 }}>Date: {date}</Text>
          </View>
        </View>

        <View style={S.divider} />
        <Text style={S.poTitle}>PURCHASE ORDER</Text>

        {/* Vendor + Meta */}
        <View style={S.twoCol}>
          <View style={S.col}>
            <Text style={{ fontSize: 7, color: "#aaa", marginBottom: 3 }}>TO</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold" }}>{vendor?.name ?? "—"}</Text>
            {vendor?.address ? <Text style={{ marginTop: 2, fontSize: 7, lineHeight: 1.5 }}>{vendor.address}</Text> : null}
            {vendor?.gstin ? <Text style={{ fontSize: 7 }}>GSTIN: {vendor.gstin}</Text> : null}
            {vendor?.contact_name ? <Text style={{ fontSize: 7, marginTop: 3 }}>Kind Attn: {vendor.contact_name}</Text> : null}
            {vendor?.contact_phone ? <Text style={{ fontSize: 7 }}>Tel: {vendor.contact_phone}</Text> : null}
          </View>
          <View style={[S.col, { alignItems: "flex-end" }]}>
            {vendor?.payment_terms
              ? <Text style={{ fontSize: 7 }}>Payment: {vendor.payment_terms}</Text>
              : <Text style={{ fontSize: 7 }}>Payment: 60 Days</Text>}
          </View>
        </View>

        <View style={S.divider} />

        {/* Table Header */}
        <View style={S.tableHeaderRow}>
          <Text style={{ width: C.sr,     color: "#fff", fontWeight: "bold" }}>SR.</Text>
          <Text style={{ width: C.serial, color: "#fff", fontWeight: "bold", fontSize: 7 }}>SERIAL ID</Text>
          <Text style={{ width: C.desc,   color: "#fff", fontWeight: "bold" }}>PARTICULARS</Text>
          <Text style={{ width: C.qty,    color: "#fff", fontWeight: "bold", textAlign: "right" }}>QTY.</Text>
          <Text style={{ width: C.rate,   color: "#fff", fontWeight: "bold", textAlign: "right" }}>RATE (Rs.)</Text>
          <Text style={{ width: C.total,  color: "#fff", fontWeight: "bold", textAlign: "right" }}>TOTAL (Rs.)</Text>
        </View>

        {/* Line Items */}
        {lineItems.map((item, i) => (
          <View key={i}>
            <View style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
              <Text style={{ width: C.sr,     color: "#999" }}>{i + 1}</Text>
              <Text style={{ width: C.serial, fontSize: 6.5, color: "#3a4a8a", fontWeight: "bold" }}>
                {item.serial_id ?? ""}
              </Text>
              <Text style={{ width: C.desc }}>{item.name}</Text>
              <Text style={{ width: C.qty,   textAlign: "right" }}>
                {item.quantity} {item.unit ?? ""}
              </Text>
              <Text style={{ width: C.rate,  textAlign: "right" }}>
                {item.unit_price ? item.unit_price.toLocaleString("en-IN") : "—"}
              </Text>
              <Text style={{ width: C.total, textAlign: "right", fontWeight: "bold" }}>
                {item.total ? item.total.toLocaleString("en-IN") : "—"}
              </Text>
            </View>
            {item.custom_note ? (
              <View style={i % 2 === 0 ? [S.noteRow] : [S.noteRow, { backgroundColor: "#f7f7f7" }]}>
                <Text style={{ width: C.sr }} />
                <Text style={{ width: C.serial }} />
                <Text style={{ fontSize: 6.5, color: "#666", fontStyle: "italic" }}>↳ {item.custom_note}</Text>
              </View>
            ) : null}
          </View>
        ))}

        {/* Totals */}
        {pfAmount > 0 && (
          <View style={[S.totalsBlock, { marginTop: 4 }]}>
            <Text style={S.totalLabel}>SUBTOTAL:</Text>
            <Text style={S.totalValue}>Rs. {po.subtotal.toLocaleString("en-IN")}</Text>
          </View>
        )}
        {pfAmount > 0 && (
          <View style={[S.totalsBlock, { marginTop: 2 }]}>
            <Text style={S.totalLabel}>P&F:</Text>
            <Text style={S.totalValue}>Rs. {pfAmount.toLocaleString("en-IN")}</Text>
          </View>
        )}
        <View style={[S.totalsBlock, { marginTop: 4, borderTopWidth: 1, borderColor: "#000", paddingTop: 4 }]}>
          <Text style={[S.totalLabel, { fontSize: 10, fontWeight: "bold" }]}>TOTAL:</Text>
          <Text style={[S.totalValue, { fontSize: 10, fontWeight: "bold" }]}>Rs. {po.total.toLocaleString("en-IN")}</Text>
        </View>

        {/* Notes */}
        {po.notes ? (
          <View style={{ marginTop: 10, padding: 6, backgroundColor: "#f0f2ff", borderRadius: 3 }}>
            <Text style={[S.bold, { marginBottom: 2 }]}>Notes:</Text>
            <Text style={{ color: "#444", lineHeight: 1.5 }}>{po.notes}</Text>
          </View>
        ) : null}

        {/* Signature */}
        <View style={S.signatureBlock}>
          <Text style={S.bold}>FOR VITON ENGINEERS PVT. LTD.</Text>
          <Text style={{ marginTop: 28 }}>______________________________</Text>
          <Text style={{ textAlign: "center", marginTop: 2, color: "#666" }}>Authorised Signatory</Text>
        </View>

        {/* Footer Terms */}
        <View style={S.footer}>
          <View style={S.footerCol}>
            <Text style={S.footerLine}><Text style={S.bold}>DELIVERY: </Text>{dispatch.delivery ?? "Urgent"}</Text>
            <Text style={S.footerLine}><Text style={S.bold}>MODE OF DESPATCH: </Text>{dispatch.mode_of_dispatch ?? "—"}</Text>
            <Text style={S.footerLine}><Text style={S.bold}>PLACE OF DELIVERY: </Text>{dispatch.place_of_delivery ?? "At Ambernath Works"}</Text>
          </View>
          <View style={S.footerCol}>
            <Text style={S.footerLine}><Text style={S.bold}>INSPECTION: </Text>{dispatch.inspection ?? "By VITON"}</Text>
            <Text style={S.footerLine}><Text style={S.bold}>P&F: </Text>{pfAmount > 0 ? `Rs. ${pfAmount.toLocaleString("en-IN")}` : "Nil"}</Text>
            <Text style={S.footerLine}><Text style={S.bold}>TAXES: </Text>{dispatch.taxes ?? "At Actual"}</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
