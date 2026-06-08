import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { GRN, GRNLineItem, Vendor } from "@/lib/types";

interface PORef {
  po_number: string;
  created_at: string;
}

const BRAND = "#1a1a6e";
const LIGHT_BG = "#ebebeb";
const BORDER = "#000000";
const TEXT_DARK = "#000000";

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: TEXT_DARK,
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 24,
    paddingRight: 24,
    backgroundColor: "#ffffff",
  },

  // ── Header ────────────────────────────────────────────────────
  headerTable: {
    width: "100%",
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerRowLast: {
    flexDirection: "row",
  },
  headerLabel: {
    width: "15%",
    padding: 4,
    backgroundColor: LIGHT_BG,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  headerValue: {
    width: "15%",
    padding: 4,
    fontSize: 7.5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  headerCenter: {
    width: "40%",
    padding: 6,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  headerCenterText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerCenterSub: {
    color: "#ffffff",
    fontSize: 7,
    marginTop: 2,
    opacity: 0.85,
  },
  headerCenterCompany: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginTop: 4,
  },

  // ── Supplier / Received ───────────────────────────────────────
  sectionTable: {
    width: "100%",
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    backgroundColor: BRAND,
  },
  sectionHeaderCell: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    padding: 3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sectionRowLast: {
    flexDirection: "row",
  },
  sectionLabel: {
    width: "18%",
    padding: 4,
    backgroundColor: LIGHT_BG,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  sectionValue: {
    width: "37%",
    padding: 4,
    fontSize: 7.5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  sectionValueRight: {
    width: "45%",
    padding: 4,
    fontSize: 7.5,
  },

  // ── Items Table ─────────────────────────────────────────────────
  itemsTable: {
    width: "100%",
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 6,
  },
  itemsHeaderRow: {
    flexDirection: "row",
    backgroundColor: BRAND,
  },
  itemsHeaderCell: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    padding: 4,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  itemsHeaderCellLast: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    padding: 4,
    textAlign: "center",
  },
  itemsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    minHeight: 18,
  },
  itemsRowLast: {
    flexDirection: "row",
    minHeight: 18,
  },
  itemsCell: {
    fontSize: 7.5,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#cccccc",
    textAlign: "center",
  },
  itemsCellLeft: {
    fontSize: 7.5,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#cccccc",
    textAlign: "left",
  },
  itemsCellLast: {
    fontSize: 7.5,
    padding: 4,
    textAlign: "left",
  },
  itemsCellMono: {
    fontSize: 7,
    fontFamily: "Helvetica",
    color: "#3a4a8a",
    textAlign: "center",
  },

  colSr:      { width: "5%", flexShrink: 0 },
  colDesc:    { width: "32%", flexShrink: 0 },
  colPoNo:    { width: "14%", flexShrink: 0 },
  colPoDate:  { width: "10%", flexShrink: 0 },
  colChWt:    { width: "9%", flexShrink: 0 },
  colChNos:   { width: "8%", flexShrink: 0 },
  colCntNos:  { width: "8%", flexShrink: 0 },
  colAcc:     { width: "8%", flexShrink: 0 },
  colRej:     { width: "8%", flexShrink: 0 },
  colRemark:  { width: "10%", flexShrink: 0 },

  // ── Remark ────────────────────────────────────────────────────
  remarkRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#cccccc",
    borderTopWidth: 0,
  },
  remarkLabel: {
    width: "12%",
    padding: 5,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    borderRightWidth: 1,
    borderRightColor: "#cccccc",
  },
  remarkValue: {
    flex: 1,
    padding: 5,
    fontSize: 7.5,
  },

  // ── Signatures ────────────────────────────────────────────────
  signatureRow: {
    flexDirection: "row",
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
  signatureBlock: {
    width: "50%",
    paddingHorizontal: 8,
  },
  signatureLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  signatureName: {
    fontSize: 7.5,
    color: "#444444",
    marginTop: 3,
  },
});

export function GRNPdfDocument({
  grn,
  po,
  vendor,
}: {
  grn: GRN;
  po: PORef | null;
  vendor: Vendor | null;
}) {
  const lines = (grn.line_items ?? []) as GRNLineItem[];
  const grnDate = grn.grn_date ?? new Date(grn.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  });
  const poDate = po
    ? new Date(po.created_at).toLocaleDateString("en-IN", {
        day: "2-digit", month: "2-digit", year: "numeric",
      })
    : "—";

  const MIN_ROWS = 10;
  const paddedLines: (GRNLineItem | null)[] = [
    ...lines,
    ...Array(Math.max(0, MIN_ROWS - lines.length)).fill(null),
  ];

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Header ── */}
        <View style={S.headerTable}>
          <View style={S.headerRow}>
            <Text style={S.headerLabel}>Document No.</Text>
            <Text style={S.headerValue}>VT-STR-R-02</Text>
            <View style={S.headerCenter}>
              <Text style={S.headerCenterText}>Goods Receipt Note</Text>
              <Text style={S.headerCenterSub}>GRN</Text>
              <Text style={S.headerCenterCompany}>VITON ENGINEERS PVT LTD</Text>
            </View>
            <Text style={S.headerLabel}>GRN No.</Text>
            <Text style={[S.headerValue, { fontFamily: "Helvetica-Bold" }]}>
              {grn.grn_number}
            </Text>
          </View>
          <View style={S.headerRow}>
            <Text style={S.headerLabel}>Revision No.</Text>
            <Text style={S.headerValue}>{grn.revision_no ?? "00"}</Text>
            <View style={{ width: "40%" }} />
            <Text style={S.headerLabel}>GRN Date</Text>
            <Text style={S.headerValue}>{grnDate}</Text>
          </View>
          <View style={S.headerRowLast}>
            <Text style={S.headerLabel}>Revision Date</Text>
            <Text style={S.headerValue}>{grn.revision_date ?? "01/10/2025"}</Text>
            <View style={{ width: "40%" }} />
            <Text style={S.headerLabel}>Status</Text>
            <Text style={[S.headerValue, { fontFamily: "Helvetica-Bold" }]}>
              {grn.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── Supplier / Received ── */}
        <View style={S.sectionTable}>
          <View style={S.sectionHeaderRow}>
            <Text style={[S.sectionHeaderCell, { width: "55%" }]}>Supplier Details</Text>
            <Text style={[S.sectionHeaderCell, { width: "45%" }]}>Received At</Text>
          </View>

          <View style={S.sectionRow}>
            <Text style={S.sectionLabel}>Supplier Name</Text>
            <Text style={[S.sectionValue, { fontFamily: "Helvetica-Bold" }]}>
              {grn.vendor_name ?? "—"}
            </Text>
            <Text style={S.sectionLabel}>Company</Text>
            <Text style={S.sectionValueRight}>M/s. VITON ENGINEERS PVT LTD</Text>
          </View>

          <View style={S.sectionRow}>
            <Text style={S.sectionLabel}>Supplier Address</Text>
            <Text style={S.sectionValue}>{vendor?.address ?? "—"}</Text>
            <Text style={S.sectionLabel}>Address</Text>
            <Text style={S.sectionValueRight}>
              Plot No. B-40/1, Addl. Ambernath MIDC,{"\n"}
              Anand Nagar, Ambernath E, Dist. Thane - 421506
            </Text>
          </View>

          <View style={S.sectionRow}>
            <Text style={S.sectionLabel}>Supplier GSTIN</Text>
            <Text style={[S.sectionValue, { fontFamily: "Helvetica-Bold" }]}>
              {vendor?.gstin ?? "—"}
            </Text>
            <Text style={S.sectionLabel}>Email</Text>
            <Text style={S.sectionValueRight}>viton.engg@gmail.com</Text>
          </View>

          <View style={S.sectionRow}>
            <Text style={S.sectionLabel}>Challan / Inv No.</Text>
            <Text style={[S.sectionValue, { fontFamily: "Helvetica-Bold" }]}>
              {grn.challan_no ?? "—"}
            </Text>
            <Text style={S.sectionLabel}>GST No.</Text>
            <Text style={[S.sectionValueRight, { fontFamily: "Helvetica-Bold" }]}>
              27AACCV7755N1ZK
            </Text>
          </View>

          <View style={S.sectionRow}>
            <Text style={S.sectionLabel}>Challan / Inv Date</Text>
            <Text style={S.sectionValue}>{grn.challan_date ?? "—"}</Text>
            <Text style={S.sectionLabel}>Received By</Text>
            <Text style={S.sectionValueRight}>{grn.received_by_name ?? "—"}</Text>
          </View>

          <View style={S.sectionRow}>
            <Text style={S.sectionLabel}>PO No.</Text>
            <Text style={[S.sectionValue, { fontFamily: "Helvetica" }]}>
              {po?.po_number ?? (grn.po_id ? "Linked" : "Direct Receipt")}
            </Text>
            <Text style={S.sectionLabel} />
            <Text style={S.sectionValueRight} />
          </View>

          <View style={S.sectionRow}>
            <Text style={S.sectionLabel}>PO Date</Text>
            <Text style={S.sectionValue}>{poDate}</Text>
            <Text style={S.sectionLabel} />
            <Text style={S.sectionValueRight} />
          </View>

          <View style={S.sectionRowLast}>
            <Text style={S.sectionLabel}>Inspected By</Text>
            <Text style={S.sectionValue}>{grn.inspected_by_name ?? "—"}</Text>
            <Text style={S.sectionLabel}>Approved By</Text>
            <Text style={[S.sectionValueRight, { fontFamily: "Helvetica-Bold" }]}>Yatish Jain</Text>
          </View>
        </View>

        {/* ── Items Table ── */}
        <View style={S.itemsTable}>
          <View style={S.itemsHeaderRow}>
            <Text style={[S.itemsHeaderCell, S.colSr]}>Sr No.</Text>
            <Text style={[S.itemsHeaderCell, S.colDesc]}>Description of Material</Text>
            <Text style={[S.itemsHeaderCell, S.colPoNo]}>PO No.</Text>
            <Text style={[S.itemsHeaderCell, S.colPoDate]}>PO Date</Text>
            <Text style={[S.itemsHeaderCell, S.colChWt]}>Challan Qty{"\n"}(Kgs/Mtr)</Text>
            <Text style={[S.itemsHeaderCell, S.colChNos]}>Challan Qty{"\n"}(Nos)</Text>
            <Text style={[S.itemsHeaderCell, S.colCntNos]}>Counted Qty{"\n"}(Nos)</Text>
            <Text style={[S.itemsHeaderCell, S.colAcc]}>Accepted Qty{"\n"}(Nos)</Text>
            <Text style={[S.itemsHeaderCell, S.colRej]}>Rejection Qty{"\n"}(Nos)</Text>
            <Text style={[S.itemsHeaderCellLast, S.colRemark]}>Remark</Text>
          </View>

          {paddedLines.map((line, i) => (
            <View
              key={i}
              style={i < paddedLines.length - 1 ? S.itemsRow : S.itemsRowLast}
            >
              <Text style={[S.itemsCell, S.colSr, { color: "#666666" }]}>
                {line ? i + 1 : ""}
              </Text>
              <Text style={[S.itemsCellLeft, S.colDesc]}>
                {line?.name ?? ""}
              </Text>
              <Text style={[S.itemsCell, S.colPoNo, S.itemsCellMono]}>
                {line ? (po?.po_number ?? "—") : ""}
              </Text>
              <Text style={[S.itemsCell, S.colPoDate]}>
                {line ? poDate : ""}
              </Text>
              <Text style={[S.itemsCell, S.colChWt]}>
                {line?.challan_weight ?? ""}
              </Text>
              <Text style={[S.itemsCell, S.colChNos]}>
                {line?.challan_nos ?? line?.received_qty ?? ""}
              </Text>
              <Text style={[S.itemsCell, S.colCntNos]}>
                {line?.counted_nos ?? line?.received_qty ?? ""}
              </Text>
              <Text style={[S.itemsCell, S.colAcc]}>
                {line?.accepted_qty ?? ""}
              </Text>
              <Text style={[S.itemsCell, S.colRej]}>
                {line && line.rejected_qty > 0 ? line.rejected_qty : ""}
              </Text>
              <Text style={[S.itemsCellLast, S.colRemark]}>
                {line?.rejection_reason ?? ""}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Remark ── */}
        <View style={S.remarkRow}>
          <Text style={S.remarkLabel}>Remark :</Text>
          <Text style={S.remarkValue}>{grn.inspection_notes ?? ""}</Text>
        </View>

        {/* ── Signatures ── */}
        <View style={S.signatureRow}>
          <View style={S.signatureBlock}>
            <Text style={S.signatureLabel}>Prepared By</Text>
            <Text style={S.signatureName}>{grn.received_by_name ?? ""}</Text>
          </View>
          <View style={S.signatureBlock}>
            <Text style={S.signatureLabel}>Approved By</Text>
            <Text style={S.signatureName}>Yatish Jain</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
