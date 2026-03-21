import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

interface DispatchMeta {
  mode_of_dispatch: string;
  delivery: string;
  place_of_delivery: string;
  inspection: string;
  taxes: string;
  payment_date?: string;
  pf_mode: "nil" | "percent" | "fixed";
  pf_value: number;
}

interface LineItem {
  serial_id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  custom_note?: string;
}

interface VendorData {
  name?: string;
  address?: string | null;
  delivery_address?: string | null;
  gstin?: string | null;
  delivery_gstin?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  payment_terms?: string | null;
}

interface POData {
  po_number: string;
  created_at: string;
  subtotal: number;
  total: number;
  notes?: string | null;
  line_items: LineItem[];
  dispatch_meta?: DispatchMeta | Record<string, unknown> | null;
  vendors?: VendorData | null;
  quot_no?: string | null;
  quot_date?: string | null;
}

function computePF(subtotal: number, meta: DispatchMeta): number {
  if (meta.pf_mode === "nil" || meta.pf_value <= 0) return 0;
  if (meta.pf_mode === "percent") return Math.round((subtotal * meta.pf_value) / 100);
  return meta.pf_value;
}

const BRAND = "#5060AB";
const LIGHT_BG = "#f8f8f8";
const BORDER = "#e5e5e5";
const TEXT_DARK = "#111111";
const TEXT_MID = "#555555";
const TEXT_LIGHT = "#999999";

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: TEXT_DARK,
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 32,
    paddingRight: 32,
    backgroundColor: "#ffffff",
  },

  // ── Letterhead ──────────────────────────────────────────────────
  letterhead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 10,
    borderBottomWidth: 2.5,
    borderBottomColor: BRAND,
    marginBottom: 10,
  },
  letterheadLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  logo: {
    width: 44,
    height: 44,
    marginRight: 10,
  },
  companyName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: TEXT_DARK,
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 7,
    color: TEXT_MID,
    lineHeight: 1.5,
  },
  companyDetailBold: {
    fontSize: 7,
    color: TEXT_MID,
    fontFamily: "Helvetica-Bold",
  },

  // ── PO Box ──────────────────────────────────────────────────────
  poBox: {
    borderWidth: 1.5,
    borderColor: BRAND,
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 14,
    alignItems: "center",
    minWidth: 160,
  },
  poBoxTitleWrap: {
    backgroundColor: BRAND,
    width: "100%",
    borderRadius: 3,
    paddingVertical: 4,
    alignItems: "center",
  },
  poBoxTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  poBoxNumber: {
    fontSize: 7,
    fontFamily: "Helvetica",
    color: "#666666",
    marginTop: 5,
    textAlign: "center",
  },
  poBoxDate: {
    fontSize: 7,
    color: "#666666",
    marginTop: 5,
    textAlign: "right",
  },

  // ── To + Meta Row ───────────────────────────────────────────────
  metaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  metaCard: {
    flex: 1,
    backgroundColor: LIGHT_BG,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 8,
  },
  metaCardLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#aaaaaa",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  vendorName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: TEXT_DARK,
    marginBottom: 2,
  },
  vendorDetail: {
    fontSize: 7,
    color: TEXT_MID,
    lineHeight: 1.5,
  },
  vendorDetailBold: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#444444",
    marginTop: 4,
  },
  metaTableRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  metaTableLabel: {
    fontSize: 7,
    color: "#888888",
    width: "45%",
  },
  metaTableValue: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: TEXT_DARK,
    flex: 1,
  },

  // ── Items Table ─────────────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ebebeb",
    paddingVertical: 5,
    paddingHorizontal: 4,
    minHeight: 16,
  },
  tableRowAlt: {
    backgroundColor: "#fafafa",
  },
  tableCell: {
    fontSize: 7,
    color: TEXT_DARK,
  },
  // FIX: smaller font + overflow hidden stops serial ID bleeding
  tableCellMono: {
    fontSize: 6.5,
    fontFamily: "Helvetica",
    color: "#3a4a8a",
  },
  tableCellLight: {
    fontSize: 7,
    color: "#666666",
  },
  // FIX: note row text style
  noteText: {
    fontSize: 7,
    color: "#666666",
    fontStyle: "italic",
  },

  // FIX: column widths — overflow hidden on serial column is the key
  colSr:     { width: 22, flexShrink: 0 },
  colSerial: { width: 100, flexShrink: 0, overflow: "hidden" },
  colDesc:   { flex: 1 },
  colQty:    { width: 34, flexShrink: 0 },
  colUnit:   { width: 32, flexShrink: 0 },
  colRate:   { width: 58, flexShrink: 0 },
  colTotal:  { width: 66, flexShrink: 0 },

  // ── Totals ──────────────────────────────────────────────────────
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 0.5,
    borderTopColor: "#dddddd",
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  totalsLabel: {
    fontSize: 7,
    color: TEXT_MID,
    width: 120,
    textAlign: "right",
    paddingRight: 6,
  },
  totalsValue: {
    fontSize: 7,
    color: TEXT_DARK,
    width: 66,
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: BRAND,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  grandTotalLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    width: 120,
    textAlign: "right",
    paddingRight: 6,
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    width: 66,
    textAlign: "right",
  },

  // ── Notes ───────────────────────────────────────────────────────
  notesBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f0f2ff",
    borderWidth: 0.5,
    borderColor: "#c7ccee",
    borderRadius: 4,
  },
  notesLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    marginBottom: 3,
  },
  notesText: {
    fontSize: 7,
    color: "#444444",
    lineHeight: 1.6,
  },

  // ── Dispatch Footer Table ────────────────────────────────────────
  dispatchTable: {
    marginTop: 10,
    borderWidth: 0.5,
    borderColor: "#dddddd",
    borderRadius: 4,
  },
  dispatchRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
  },
  dispatchRowLast: {
    flexDirection: "row",
  },
  dispatchCell: {
    flex: 1,
    padding: 5,
    borderRightWidth: 0.5,
    borderRightColor: "#e5e5e5",
  },
  dispatchCellLast: {
    flex: 1,
    padding: 5,
  },
  dispatchLabel: {
    fontSize: 6,
    color: TEXT_LIGHT,
    marginBottom: 1,
  },
  dispatchValue: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: TEXT_DARK,
  },

  // ── Disclaimer ──────────────────────────────────────────────────
  disclaimer: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 6.5,
    color: "#777777",
  },
});

export function POPdfDocument({ po }: { po: POData }) {
  const vendor = po.vendors ?? null;
  const rawDispatch = po.dispatch_meta as Partial<DispatchMeta> | null | undefined;
  const dispatch: DispatchMeta = {
    mode_of_dispatch: rawDispatch?.mode_of_dispatch ?? "",
    delivery: rawDispatch?.delivery ?? "",
    place_of_delivery: rawDispatch?.place_of_delivery ?? "",
    inspection: rawDispatch?.inspection ?? "",
    taxes: rawDispatch?.taxes ?? "",
    payment_date: rawDispatch?.payment_date ?? "",
    pf_mode:
      rawDispatch?.pf_mode === "percent" || rawDispatch?.pf_mode === "fixed"
        ? rawDispatch.pf_mode
        : "nil",
    pf_value: typeof rawDispatch?.pf_value === "number" ? rawDispatch.pf_value : 0,
  };
  const lineItems = po.line_items ?? [];
  const subtotal = po.subtotal ?? 0;
  const pfAmount = computePF(subtotal, dispatch);
  const grandTotal = po.total ?? 0;

  const displayAddress = vendor?.delivery_address || vendor?.address || null;
  const displayGstin = vendor?.delivery_gstin || vendor?.gstin || null;
  const paymentTerms = vendor?.payment_terms ?? "60 Days";

  const date = new Date(po.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const pfDisplay =
    dispatch.pf_mode === "nil"
      ? "Nil"
      : `Rs. ${pfAmount.toLocaleString("en-IN")}${
          dispatch.pf_mode === "percent" ? ` (${dispatch.pf_value}%)` : ""
        }`;

  const dispatchRows = [
    [
      { label: "DELIVERY", value: dispatch.delivery || "—" },
      { label: "INSPECTION", value: dispatch.inspection || "—" },
    ],
    [
      { label: "MODE OF DESPATCH", value: dispatch.mode_of_dispatch || "—" },
      { label: "PACKING & FORWARDING", value: pfDisplay },
    ],
    [
      { label: "PLACE OF DELIVERY", value: dispatch.place_of_delivery || "—" },
      { label: "TAXES", value: dispatch.taxes || "—" },
    ],
    [
      { label: "PAYMENT TERMS", value: paymentTerms },
      { label: "PAYMENT DATE", value: dispatch.payment_date || "—" },
    ],
  ];

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Letterhead ── */}
        <View style={S.letterhead}>
          <View style={S.letterheadLeft}>
            <Image src="/Logo.JPG" style={S.logo} />
            <View style={{ flex: 1 }}>
              <Text style={S.companyName}>VITON ENGINEERS PVT. LTD.</Text>
              <Text style={S.companyDetail}>
                WORKS: B40/1, ADDL. Ambernath MIDC, Anand Nagar, Opp. Hali Pad,{"\n"}
                Ambernath East, Dist. Thane - 421506
              </Text>
              <Text style={S.companyDetail}>
                Tel: 08779301215 / 9769639388{"  "}|{"  "}Email: info@vitonvalves.com
                {"  "}|{"  "}GSTIN:{" "}
                <Text style={S.companyDetailBold}>27AACCV7755N1ZK</Text>
              </Text>
            </View>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <View style={S.poBox}>
              <View style={S.poBoxTitleWrap}>
                <Text style={S.poBoxTitle}>Purchase Order</Text>
              </View>
              <Text style={S.poBoxNumber}>{po.po_number}</Text>
            </View>
            <Text style={S.poBoxDate}>Date: {date}</Text>
          </View>
        </View>

        {/* ── To + Meta ── */}
        <View style={S.metaRow}>
          <View style={S.metaCard}>
            <Text style={S.metaCardLabel}>To</Text>
            <Text style={S.vendorName}>{vendor?.name ?? "—"}</Text>
            {displayAddress ? (
              <Text style={S.vendorDetail}>{displayAddress}</Text>
            ) : null}
            {displayGstin ? (
              <Text style={S.vendorDetail}>GSTIN: {displayGstin}</Text>
            ) : null}
            {vendor?.contact_name ? (
              <Text style={S.vendorDetailBold}>Kind Attn: {vendor.contact_name}</Text>
            ) : null}
            {vendor?.contact_phone ? (
              <Text style={S.vendorDetail}>Tel: {vendor.contact_phone}</Text>
            ) : null}
          </View>

          <View style={S.metaCard}>
            {po.quot_no ? (
              <View style={S.metaTableRow}>
                <Text style={S.metaTableLabel}>Your Quot. No.</Text>
                <Text style={S.metaTableValue}>{po.quot_no}</Text>
              </View>
            ) : null}
            {po.quot_date ? (
              <View style={S.metaTableRow}>
                <Text style={S.metaTableLabel}>Your Quot. Date</Text>
                <Text style={S.metaTableValue}>
                  {new Date(po.quot_date).toLocaleDateString("en-IN")}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Table Header ── */}
        <View style={S.tableHeader}>
          <View style={S.colSr}>
            <Text style={S.tableHeaderCell}>Sr.</Text>
          </View>
          <View style={S.colSerial}>
            <Text style={S.tableHeaderCell}>Serial ID</Text>
          </View>
          <View style={S.colDesc}>
            <Text style={S.tableHeaderCell}>Particulars</Text>
          </View>
          <View style={[S.colQty, { alignItems: "center" }]}>
            <Text style={S.tableHeaderCell}>Qty.</Text>
          </View>
          <View style={[S.colUnit, { alignItems: "center" }]}>
            <Text style={S.tableHeaderCell}>Unit</Text>
          </View>
          <View style={[S.colRate, { alignItems: "flex-end" }]}>
            <Text style={S.tableHeaderCell}>Rate Rs.</Text>
          </View>
          <View style={[S.colTotal, { alignItems: "flex-end" }]}>
            <Text style={S.tableHeaderCell}>Total Rs.</Text>
          </View>
        </View>

        {/* ── Table Rows ── */}
        {lineItems.map((line, i) => (
          <React.Fragment key={i}>
            <View style={[S.tableRow, i % 2 !== 0 ? S.tableRowAlt : {}]}>
              <View style={S.colSr}>
                <Text style={S.tableCellLight}>{i + 1}</Text>
              </View>
              {/* FIX: overflow hidden on this View clips the serial ID */}
              <View style={S.colSerial}>
                <Text style={S.tableCellMono}>{line.serial_id}</Text>
              </View>
              <View style={S.colDesc}>
                <Text style={S.tableCell}>{line.name}</Text>
              </View>
              <View style={[S.colQty, { alignItems: "center" }]}>
                <Text style={S.tableCell}>{line.quantity}</Text>
              </View>
              <View style={[S.colUnit, { alignItems: "center" }]}>
                <Text style={S.tableCellLight}>{line.unit}</Text>
              </View>
              <View style={[S.colRate, { alignItems: "flex-end" }]}>
                <Text style={S.tableCell}>
                  {Number(line.unit_price || 0).toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={[S.colTotal, { alignItems: "flex-end" }]}>
                <Text style={[S.tableCell, { fontFamily: "Helvetica-Bold" }]}>
                  {Number(line.total || 0).toLocaleString("en-IN")}
                </Text>
              </View>
            </View>

            {/* FIX: note row now has BOTH colSr and colSerial spacers
                so note text aligns under Particulars, not Serial ID */}
            {line.custom_note ? (
              <View style={[S.tableRow, { paddingTop: 0, borderTopWidth: 0 }, i % 2 !== 0 ? S.tableRowAlt : {}]}>
                <View style={S.colSr} />
                <View style={S.colSerial} />
                <View style={{ flex: 1 }}>
                  <Text style={S.noteText}>Note: {line.custom_note}</Text>
                </View>
              </View>
            ) : null}
          </React.Fragment>
        ))}

        {/* ── Subtotal + P&F ── */}
        {pfAmount > 0 && (
          <View style={S.totalsRow}>
            <Text style={S.totalsLabel}>Subtotal</Text>
            <Text style={S.totalsValue}>{subtotal.toLocaleString("en-IN")}</Text>
          </View>
        )}
        {pfAmount > 0 && (
          <View style={[S.totalsRow, { borderTopWidth: 0 }]}>
            <Text style={S.totalsLabel}>
              Packing & Forwarding
              {dispatch.pf_mode === "percent" ? ` (${dispatch.pf_value}%)` : ""}
            </Text>
            <Text style={S.totalsValue}>{pfAmount.toLocaleString("en-IN")}</Text>
          </View>
        )}

        {/* ── Grand Total ── */}
        <View style={S.grandTotalRow}>
          <Text style={S.grandTotalLabel}>TOTAL</Text>
          <Text style={S.grandTotalValue}>Rs. {grandTotal.toLocaleString("en-IN")}</Text>
        </View>

        {/* ── Notes ── */}
        {po.notes ? (
          <View style={S.notesBox}>
            <Text style={S.notesLabel}>Notes:</Text>
            <Text style={S.notesText}>{po.notes}</Text>
          </View>
        ) : null}

        {/* ── Dispatch Footer Table ── */}
        <View style={S.dispatchTable}>
          {dispatchRows.map((row, ri) => (
            <View
              key={ri}
              style={ri < dispatchRows.length - 1 ? S.dispatchRow : S.dispatchRowLast}
            >
              {row.map((cell, ci) => (
                <View key={ci} style={ci === 0 ? S.dispatchCell : S.dispatchCellLast}>
                  {cell.label ? (
                    <Text style={S.dispatchLabel}>{cell.label}</Text>
                  ) : null}
                  {cell.value ? (
                    <Text style={S.dispatchValue}>{cell.value}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* ── Disclaimer ── */}
        <Text style={S.disclaimer}>
          This is a computer generated Purchase Order and does not require a signature.
        </Text>

      </Page>
    </Document>
  );
}
