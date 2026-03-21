import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const S = StyleSheet.create({
  page: { fontSize: 8, fontFamily: "Helvetica", padding: 36, color: "#000" },
  bold: { fontWeight: "bold" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#5060AB", paddingVertical: 6, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#ddd", paddingVertical: 5, paddingHorizontal: 4, minHeight: 18 },
  tableRowAlt: { flexDirection: "row", backgroundColor: "#fafafa", borderBottomWidth: 0.5, borderColor: "#ddd", paddingVertical: 5, paddingHorizontal: 4, minHeight: 18 },
  noteRow: { flexDirection: "row", paddingLeft: 4, paddingBottom: 5, paddingHorizontal: 4 },
  totalsBlock: { flexDirection: "row", justifyContent: "flex-end", marginTop: 3 },
  totalLabel: { width: "25%", textAlign: "right", paddingRight: 6, color: "#555" },
  totalValue: { width: "14%", textAlign: "right" },
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
  const pfLabel = pfAmount > 0
    ? dispatch.pf_mode === "percent"
      ? `Rs. ${pfAmount.toLocaleString("en-IN")} (${dispatch.pf_value}%)`
      : `Rs. ${pfAmount.toLocaleString("en-IN")}`
    : "Nil";

  const date = new Date(po.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Letterhead ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 10, borderBottomWidth: 3, borderBottomColor: "#5060AB", marginBottom: 12 }}>
          {/* Left: logo + address — strictly 60% wide */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", width: "60%" }}>
            <Image
              src="https://vitonvalves.vercel.app/Logo.JPG"
              style={{ width: 46, height: 46, marginRight: 8, flexShrink: 0 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#111" }}>VITON ENGINEERS PVT. LTD.</Text>
              <Text style={{ fontSize: 6.5, color: "#555", marginTop: 3, lineHeight: 1.5 }}>
                WORKS: B401, ADDL. Ambernath MIDC, Anand Nagar,{"\n"}Opp. Hali Pad, Ambernath East, Dist. Thane - 421506
              </Text>
              <Text style={{ fontSize: 6.5, color: "#555", lineHeight: 1.5 }}>
                OFFICE: 701, 7th Floor, Swastik Disa Corporate Park,{"\n"}LBS Marg, Ghatkopar W, Mumbai - 400086
              </Text>
              <Text style={{ fontSize: 6.5, color: "#555", marginTop: 2 }}>
                Tel: 08779301215 / 9769639388
              </Text>
              <Text style={{ fontSize: 6.5, color: "#555" }}>
                Email: info@vitonvalves.com  |  GSTIN: 27AACCV7755N1ZK
              </Text>
            </View>
          </View>
          {/* Right: PO number box — 36% wide, won't bleed */}
          <View style={{ width: "36%", alignItems: "flex-end" }}>
            <View style={{ borderWidth: 2, borderColor: "#5060AB", borderRadius: 5, padding: "6 12", alignItems: "center" }}>
              <Text style={{ fontSize: 7, color: "#999", textTransform: "uppercase", letterSpacing: 1.5 }}>Purchase Order</Text>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: "#5060AB", marginTop: 2 }}>{po.po_number}</Text>
            </View>
            <Text style={{ fontSize: 8, color: "#666", marginTop: 5 }}>Date: {date}</Text>
          </View>
        </View>

        {/* ── Vendor + Meta ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
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
              Payment Terms:{" "}<Text style={{ fontWeight: "bold", color: "#111" }}>{vendor?.payment_terms ?? "60 Days"}</Text>
            </Text>
          </View>
        </View>

        {/* ── Items Table Header ── */}
        <View style={S.tableHeaderRow}>
          <Text style={{ width: C.sr,     color: "#fff", fontWeight: "bold", fontSize: 7 }}>SR.</Text>
          <Text style={{ width: C.serial, color: "#fff", fontWeight: "bold", fontSize: 7 }}>SERIAL ID</Text>
          <Text style={{ width: C.desc,   color: "#fff", fontWeight: "bold", fontSize: 7 }}>PARTICULARS</Text>
          <Text style={{ width: C.qty,    color: "#fff", fontWeight: "bold", fontSize: 7, textAlign: "right" }}>QTY.</Text>
          <Text style={{ width: C.rate,   color: "#fff", fontWeight: "bold", fontSize: 7, textAlign: "right" }}>RATE (Rs.)</Text>
          <Text style={{ width: C.total,  color: "#fff", fontWeight: "bold", fontSize: 7, textAlign: "right" }}>TOTAL (Rs.)</Text>
        </View>

        {/* ── Line Items ── */}
        {lineItems.map((item, i) => (
          <View key={i}>
            <View style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
              <Text style={{ width: C.sr, color: "#999", fontSize: 7 }}>{i + 1}</Text>
              <View style={{ width: C.serial }}>
                <Text style={{ fontSize: 6.5, color: "#3a4a8a", fontWeight: "bold", backgroundColor: "#eef0fa", padding: "1 3", borderRadius: 2 }}>
                  {item.serial_id ?? ""}
                </Text>
              </View>
              <Text style={{ width: C.desc, fontSize: 7.5, color: "#111" }}>{item.name}</Text>
              <Text style={{ width: C.qty, textAlign: "right", fontSize: 7 }}>{item.quantity} {item.unit ?? ""}</Text>
              <Text style={{ width: C.rate, textAlign: "right", fontSize: 7 }}>{item.unit_price ? item.unit_price.toLocaleString("en-IN") : "—"}</Text>
              <Text style={{ width: C.total, textAlign: "right", fontSize: 7, fontWeight: "bold" }}>{item.total ? item.total.toLocaleString("en-IN") : "—"}</Text>
            </View>
            {item.custom_note ? (
              <View style={[S.noteRow, { backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }]}>
                <Text style={{ width: C.sr }} />
                <Text style={{ width: C.serial }} />
                <Text style={{ fontSize: 7.5, color: "#555", fontStyle: "italic" }}>
                  Note: {item.custom_note}
                </Text>
              </View>
            ) : null}
          </View>
        ))}

        {/* ── Totals ── */}
        {pfAmount > 0 && (
          <>
            <View style={[S.totalsBlock, { marginTop: 6, borderTopWidth: 0.5, borderTopColor: "#ddd", paddingTop: 4 }]}>
              <Text style={S.totalLabel}>Subtotal</Text>
              <Text style={S.totalValue}>{po.subtotal.toLocaleString("en-IN")}</Text>
            </View>
            <View style={[S.totalsBlock, { marginTop: 2 }]}>
              <Text style={S.totalLabel}>
                Packing & Forwarding{dispatch.pf_mode === "percent" ? ` (${dispatch.pf_value}%)` : ""}
              </Text>
              <Text style={S.totalValue}>{pfAmount.toLocaleString("en-IN")}</Text>
            </View>
          </>
        )}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 4 }}>
          <View style={{ backgroundColor: "#5060AB", flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderRadius: 3 }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: "#fff", textAlign: "right", width: 120, paddingRight: 8, letterSpacing: 1 }}>TOTAL</Text>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: "#fff", textAlign: "right", width: 80 }}>Rs. {po.total.toLocaleString("en-IN")}</Text>
          </View>
        </View>

        {/* ── Notes ── */}
        {po.notes ? (
          <View style={{ marginTop: 10, padding: "8 10", backgroundColor: "#f0f2ff", borderWidth: 1, borderColor: "#c7ccee", borderRadius: 4 }}>
            <Text style={{ fontWeight: "bold", color: "#5060AB", marginBottom: 3, fontSize: 8 }}>Notes:</Text>
            <Text style={{ color: "#444", lineHeight: 1.6, fontSize: 7.5 }}>{po.notes}</Text>
          </View>
        ) : null}

        {/* ── Dispatch Table (grid like the HTML preview) ── */}
        <View style={{ marginTop: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 4 }}>
          {/* Row 1 */}
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e5e5" }}>
            <View style={{ width: "50%", padding: "5 8", borderRightWidth: 1, borderRightColor: "#e5e5e5" }}>
              <Text><Text style={{ color: "#999", fontSize: 7 }}>DELIVERY: </Text><Text style={{ fontWeight: "bold", fontSize: 7 }}>{dispatch.delivery ?? "Urgent"}</Text></Text>
            </View>
            <View style={{ width: "50%", padding: "5 8" }}>
              <Text><Text style={{ color: "#999", fontSize: 7 }}>INSPECTION: </Text><Text style={{ fontWeight: "bold", fontSize: 7 }}>{dispatch.inspection ?? "By VITON"}</Text></Text>
            </View>
          </View>
          {/* Row 2 */}
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e5e5" }}>
            <View style={{ width: "50%", padding: "5 8", borderRightWidth: 1, borderRightColor: "#e5e5e5" }}>
              <Text><Text style={{ color: "#999", fontSize: 7 }}>MODE OF DESPATCH: </Text><Text style={{ fontWeight: "bold", fontSize: 7 }}>{dispatch.mode_of_dispatch || "—"}</Text></Text>
            </View>
            <View style={{ width: "50%", padding: "5 8" }}>
              <Text><Text style={{ color: "#999", fontSize: 7 }}>PACKING & FORWARDING: </Text><Text style={{ fontWeight: "bold", fontSize: 7 }}>{pfLabel}</Text></Text>
            </View>
          </View>
          {/* Row 3 */}
          <View style={{ flexDirection: "row" }}>
            <View style={{ width: "50%", padding: "5 8", borderRightWidth: 1, borderRightColor: "#e5e5e5" }}>
              <Text><Text style={{ color: "#999", fontSize: 7 }}>PLACE OF DELIVERY: </Text><Text style={{ fontWeight: "bold", fontSize: 7 }}>{dispatch.place_of_delivery ?? "At Ambernath Works"}</Text></Text>
            </View>
            <View style={{ width: "50%", padding: "5 8" }}>
              <Text><Text style={{ color: "#999", fontSize: 7 }}>TAXES: </Text><Text style={{ fontWeight: "bold", fontSize: 7 }}>{dispatch.taxes ?? "At Actual"}</Text></Text>
            </View>
          </View>
        </View>

        {/* ── Signature (bottom right, after dispatch table) ── */}
        <View style={{ alignItems: "flex-end", marginTop: 36 }}>
          <Text style={{ fontWeight: "bold", fontSize: 8 }}>FOR VITON ENGINEERS PVT. LTD.</Text>
          <Text style={{ marginTop: 32, color: "#aaa", fontSize: 8 }}>______________________________</Text>
          <Text style={{ fontSize: 7, color: "#888", marginTop: 3 }}>Authorised Signatory</Text>
        </View>

      </Page>
    </Document>
  );
}
