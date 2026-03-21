import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const S = StyleSheet.create({
  page: { fontSize: 8, fontFamily: "Helvetica", padding: 36, color: "#000" },
  bold: { fontWeight: "bold" },
  divider: { borderBottomWidth: 2, borderColor: "#5060AB", marginVertical: 8 },
  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  col: { width: "48%" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#5060AB", paddingVertical: 6, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#ddd", paddingVertical: 5, paddingHorizontal: 4, minHeight: 18 },
  tableRowAlt: { flexDirection: "row", backgroundColor: "#fafafa", borderBottomWidth: 0.5, borderColor: "#ddd", paddingVertical: 5, paddingHorizontal: 4, minHeight: 18 },
  noteRow: { flexDirection: "row", paddingLeft: 4, paddingBottom: 4, paddingHorizontal: 4 },
  totalsBlock: { flexDirection: "row", justifyContent: "flex-end", marginTop: 3 },
  totalLabel: { width: "22%", textAlign: "right", paddingRight: 6 },
  totalValue: { width: "14%", textAlign: "right" },
  signatureBlock: { alignItems: "flex-end", marginTop: 28 },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, borderTopWidth: 1, borderColor: "#bbb", paddingTop: 8 },
  footerCol: { width: "48%" },
  footerLine: { marginBottom: 4 },
});

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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 10, borderBottomWidth: 3, borderBottomColor: "#5060AB", marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", width: "65%" }}>
            <Image
              src="https://vitonvalves.vercel.app/Logo.JPG"
              style={{ width: 48, height: 48, marginRight: 10 }}
            />
            <View>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: "#111", letterSpacing: 0.3 }}>VITON ENGINEERS PVT. LTD.</Text>
              <Text style={{ fontSize: 7, color: "#555", marginTop: 3, lineHeight: 1.5 }}>
                WORKS: B401, ADDL. Ambernath MIDC, Anand Nagar, Opp. Hali Pad, Ambernath East, Dist. Thane - 421506
              </Text>
              <Text style={{ fontSize: 7, color: "#555", lineHeight: 1.5 }}>
                OFFICE: 701, 7th Floor, Swastik Disa Corporate Park, LBS Marg, Ghatkopar W, Mumbai - 400086
              </Text>
              <Text style={{ fontSize: 7, color: "#555", marginTop: 2 }}>
                Tel: 08779301215 / 9769639388  |  Email: info@vitonvalves.com  |  GSTIN: 27AACCV7755N1ZK
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", width: "32%" }}>
            <View style={{ borderWidth: 2, borderColor: "#5060AB", borderRadius: 5, padding: "6 12" }}>
              <Text style={{ fontSize: 7, color: "#999", textTransform: "uppercase", letterSpacing: 1.5 }}>Purchase Order</Text>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#5060AB", marginTop: 2 }}>{po.po_number}</Text>
            </View>
            <Text style={{ fontSize: 8, color: "#666", marginTop: 5 }}>Date: {date}</Text>
          </View>
        </View>

        {/* Vendor + Meta */}
        <View style={S.twoCol}>
          <View style={{ width: "48%", backgroundColor: "#f8f8f8", borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 4, padding: "8 10" }}>
            <Text style={{ fontSize: 7, color: "#aaa", fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>TO</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: "#111" }}>{vendor?.name ?? "—"}</Text>
            {vendor?.address ? <Text style={{ fontSize: 7, color: "#555", marginTop: 3, lineHeight: 1.5 }}>{vendor.address}</Text> : null}
            {vendor?.gstin ? <Text style={{ fontSize: 7, color: "#555", marginTop: 2 }}>GSTIN: {vendor.gstin}</Text> : null}
            {vendor?.contact_name ? <Text style={{ fontSize: 7, color: "#444", marginTop: 5 }}>Kind Attn: {vendor.contact_name}</Text> : null}
            {vendor?.contact_phone ? <Text style={{ fontSize: 7, color: "#555" }}>Tel: {vendor.contact_phone}</Text> : null}
          </View>
          <View style={{ width: "48%", backgroundColor: "#f8f8f8", borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 4, padding: "8 10" }}>
            <Text style={{ fontSize: 7, color: "#888" }}>
              Payment Terms: <Text style={{ fontWeight: "bold", color: "#111" }}>{vendor?.payment_terms ?? "60 Days"}</Text>
            </Text>
          </View>
        </View>

        {/* Table Header */}
        <View style={S.tableHeaderRow}>
          <Text style={{ width: C.sr,     color: "#fff", fontWeight: "bold", fontSize: 7 }}>SR.</Text>
          <Text style={{ width: C.serial, color: "#fff", fontWeight: "bold", fontSize: 7 }}>SERIAL ID</Text>
          <Text style={{ width: C.desc,   color: "#fff", fontWeight: "bold", fontSize: 7 }}>PARTICULARS</Text>
          <Text style={{ width: C.qty,    color: "#fff", fontWeight: "bold", fontSize: 7, textAlign: "right" }}>QTY.</Text>
          <Text style={{ width: C.rate,   color: "#fff", fontWeight: "bold", fontSize: 7, textAlign: "right" }}>RATE (Rs.)</Text>
          <Text style={{ width: C.total,  color: "#fff", fontWeight: "bold", fontSize: 7, textAlign: "right" }}>TOTAL (Rs.)</Text>
        </View>

        {/* Line Items */}
        {lineItems.map((item, i) => (
          <View key={i}>
            <View style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
              <Text style={{ width: C.sr, color: "#999", fontSize: 7 }}>{i + 1}</Text>
              <View style={{ width: C.serial, justifyContent: "flex-start" }}>
                <Text style={{ fontSize: 6.5, color: "#3a4a8a", fontWeight: "bold", backgroundColor: "#eef0fa", padding: "1 3", borderRadius: 2 }}>
                  {item.serial_id ?? ""}
                </Text>
              </View>
              <Text style={{ width: C.desc, fontSize: 7.5, color: "#111" }}>{item.name}</Text>
              <Text style={{ width: C.qty, textAlign: "right", fontSize: 7 }}>
                {item.quantity} {item.unit ?? ""}
              </Text>
              <Text style={{ width: C.rate, textAlign: "right", fontSize: 7 }}>
                {item.unit_price ? item.unit_price.toLocaleString("en-IN") : "—"}
              </Text>
              <Text style={{ width: C.total, textAlign: "right", fontSize: 7, fontWeight: "bold" }}>
                {item.total ? item.total.toLocaleString("en-IN") : "—"}
              </Text>
            </View>
            {item.custom_note ? (
              <View style={[S.noteRow, { backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }]}>
                <Text style={{ width: C.sr }} />
                <Text style={{ width: C.serial }} />
                <Text style={{ fontSize: 6.5, color: "#666", fontStyle: "italic" }}>
                  Note: {item.custom_note}
                </Text>
              </View>
            ) : null}
          </View>
        ))}

        {/* Totals */}
        {pfAmount > 0 && (
          <>
            <View style={[S.totalsBlock, { marginTop: 6 }]}>
              <Text style={[S.totalLabel, { color: "#555" }]}>SUBTOTAL:</Text>
              <Text style={S.totalValue}>{po.subtotal.toLocaleString("en-IN")}</Text>
            </View>
            <View style={[S.totalsBlock, { marginTop: 2 }]}>
              <Text style={[S.totalLabel, { color: "#555" }]}>P&F:</Text>
              <Text style={S.totalValue}>{pfAmount.toLocaleString("en-IN")}</Text>
            </View>
          </>
        )}
        <View style={[S.totalsBlock, { marginTop: 4, borderTopWidth: 1, borderTopColor: "#5060AB", paddingTop: 5, backgroundColor: "#5060AB", padding: "6 4" }]}>
          <Text style={[S.totalLabel, { fontSize: 9, fontWeight: "bold", color: "#fff" }]}>TOTAL:</Text>
          <Text style={[S.totalValue, { fontSize: 9, fontWeight: "bold", color: "#fff" }]}>Rs. {po.total.toLocaleString("en-IN")}</Text>
        </View>

        {/* Notes */}
        {po.notes ? (
          <View style={{ marginTop: 10, padding: "8 10", backgroundColor: "#f0f2ff", borderWidth: 1, borderColor: "#c7ccee", borderRadius: 4 }}>
            <Text style={[S.bold, { color: "#5060AB", marginBottom: 3 }]}>Notes:</Text>
            <Text style={{ color: "#444", lineHeight: 1.6, fontSize: 7.5 }}>{po.notes}</Text>
          </View>
        ) : null}

        {/* Signature */}
        <View style={S.signatureBlock}>
          <Text style={[S.bold, { fontSize: 8 }]}>FOR VITON ENGINEERS PVT. LTD.</Text>
          <Text style={{ marginTop: 32, color: "#aaa" }}>______________________________</Text>
          <Text style={{ fontSize: 7, color: "#888", marginTop: 3 }}>Authorised Signatory</Text>
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
