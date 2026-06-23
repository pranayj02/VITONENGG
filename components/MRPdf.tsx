import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { Requisition, ReqLineItem } from "@/lib/types";

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
  headerRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  headerLeft: {
    width: "55%",
    paddingRight: 8,
  },
  logo: {
    width: 44,
    height: 44,
    marginRight: 8,
  },
  companyName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: TEXT_DARK,
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 7,
    color: "#333333",
    lineHeight: 1.5,
  },
  companyDetailBold: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
  },
  headerRight: {
    width: "45%",
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerRightTitle: {
    backgroundColor: BRAND,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
    padding: 5,
  },
  metaRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  metaLabel: {
    width: "25%",
    padding: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  metaValue: {
    width: "25%",
    padding: 3,
    fontSize: 7,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  metaValueLast: {
    width: "25%",
    padding: 3,
    fontSize: 7,
  },

  // ── Description / WO ─────────────────────────────────────────
  descTable: {
    width: "100%",
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 4,
  },
  descRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  descRowLast: {
    flexDirection: "row",
  },
  descLabel: {
    width: "15%",
    padding: 4,
    backgroundColor: "#f5f5f5",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  descValue: {
    width: "55%",
    padding: 4,
    fontSize: 7.5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  descLabelSmall: {
    width: "12%",
    padding: 4,
    backgroundColor: "#f5f5f5",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  descValueSmall: {
    width: "18%",
    padding: 4,
    fontSize: 7.5,
  },

  // ── Items Table ───────────────────────────────────────────────
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
    minHeight: 16,
  },
  itemsRowLast: {
    flexDirection: "row",
    minHeight: 16,
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

  colSr:    { width: "5%", flexShrink: 0 },
  colDesc:  { width: "40%", flexShrink: 0 },
  colSerial: { width: "18%", flexShrink: 0 },
  colUnit:  { width: "16%", flexShrink: 0 },
  colQty:   { width: "10%", flexShrink: 0 },
  colRemark: { width: "11%", flexShrink: 0 },

  // ── Approval Section ──────────────────────────────────────────
  approvalTable: {
    width: "100%",
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 6,
  },
  approvalHeader: {
    backgroundColor: BRAND,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    padding: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  approvalRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  approvalRowLast: {
    flexDirection: "row",
  },
  approvalLabel: {
    width: "20%",
    padding: 4,
    backgroundColor: "#f5f5f5",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  approvalValue: {
    width: "30%",
    padding: 4,
    fontSize: 7,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  approvalValueLast: {
    width: "30%",
    padding: 4,
    fontSize: 7,
  },

  // ── Signatures ────────────────────────────────────────────────
  signatureRow: {
    flexDirection: "row",
    marginTop: 30,
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

  // ── Footer ───────────────────────────────────────────────────
  footer: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 6.5,
    color: "#888888",
    borderTopWidth: 0.5,
    borderTopColor: "#dddddd",
    paddingTop: 5,
  },
});

export function MRPdfDocument({ req }: { req: Requisition }) {
  const lines = (req.line_items ?? []) as ReqLineItem[];
  const date = new Date(req.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const revDate = new Date(req.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  });

  const MIN_ROWS = 8;
  const paddedLines: (ReqLineItem | null)[] = [
    ...lines,
    ...Array(Math.max(0, MIN_ROWS - lines.length)).fill(null),
  ];

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Header ── */}
        <View style={S.headerRow}>
          <View style={S.headerLeft}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <Image src="/Logo.JPG" style={S.logo} />
              <View style={{ flex: 1 }}>
                <Text style={S.companyName}>VITON ENGINEERS PVT. LTD.</Text>
                <Text style={S.companyDetail}>
                  WORKS: B40/1, ADDL. Ambernath MIDC, Anand Nagar,{"\n"}
                  Opp. Hali Pad, Ambernath East, Dist. Thane - 421506
                </Text>
                <Text style={S.companyDetail}>
                  Tel: 08779301215 / 9769639388 | Email: info@vitonvalves.com
                </Text>
                <Text style={S.companyDetail}>
                  GSTIN: <Text style={S.companyDetailBold}>27AACCV7755N1ZK</Text>
                </Text>
              </View>
            </View>
          </View>

          <View style={S.headerRight}>
            <Text style={S.headerRightTitle}>Requisition Slip</Text>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Doc No.</Text>
              <Text style={S.metaValue}>VT-PPC-R-04</Text>
              <Text style={S.metaLabel}>Rev No.</Text>
              <Text style={S.metaValueLast}>00</Text>
            </View>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Rev Date</Text>
              <Text style={S.metaValue}>01/06/2026</Text>
              <Text style={S.metaLabel}>Req No.</Text>
              <Text style={[S.metaValueLast, { fontFamily: "Helvetica-Bold" }]}>
                {req.req_number}
              </Text>
            </View>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Date</Text>
              <Text style={[S.metaValue, { width: "75%" }]}>{date}</Text>
            </View>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Priority</Text>
              <Text style={[S.metaValue, { width: "75%", fontFamily: "Helvetica-Bold",
                color: req.priority === "urgent" ? "#cc0000" : req.priority === "high" ? "#cc6600" : "#000000" }]}>
                {req.priority.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Description / WO ── */}
        <View style={S.descTable}>
          <View style={S.descRow}>
            <Text style={S.descLabel}>Description</Text>
            <Text style={S.descValue}>{req.notes ?? ""}</Text>
            <Text style={S.descLabelSmall}>WO No.</Text>
            <Text style={S.descValueSmall}>{req.po_id ?? ""}</Text>
          </View>
          <View style={S.descRowLast}>
            <Text style={S.descLabel}>Dept.</Text>
            <Text style={S.descValue}>{req.department ?? ""}</Text>
            <Text style={S.descLabelSmall}>Req. By</Text>
            <Text style={S.descValueSmall}>{req.requested_by_name ?? req.requested_by}</Text>
          </View>
        </View>

        {/* ── Items Table ── */}
        <View style={S.itemsTable}>
          <View style={S.itemsHeaderRow}>
            <Text style={[S.itemsHeaderCell, S.colSr]}>Sr No.</Text>
            <Text style={[S.itemsHeaderCell, S.colDesc]}>Item / Description</Text>
            <Text style={[S.itemsHeaderCell, S.colSerial]}>Serial ID</Text>
            <Text style={[S.itemsHeaderCell, S.colUnit]}>Valve Size / Unit</Text>
            <Text style={[S.itemsHeaderCell, S.colQty]}>Quantity</Text>
            <Text style={[S.itemsHeaderCellLast, S.colRemark]}>Remarks</Text>
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
              <Text style={[S.itemsCell, S.colSerial, S.itemsCellMono]}>
                {line?.serial_id ?? ""}
              </Text>
              <Text style={[S.itemsCell, S.colUnit]}>
                {line?.unit ?? ""}
              </Text>
              <Text style={[S.itemsCell, S.colQty, { fontFamily: line ? "Helvetica-Bold" : "Helvetica" }]}>
                {line?.qty_requested ?? ""}
              </Text>
              <Text style={[S.itemsCellLast, S.colRemark]}>
                {line?.custom_note ?? ""}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Approval Section ── */}
        <View style={S.approvalTable}>
          <Text style={S.approvalHeader}>For Office Use Only — Approval</Text>
          <View style={S.approvalRow}>
            <Text style={S.approvalLabel}>Approved By</Text>
            <Text style={S.approvalValue}>{req.approved_by_name ?? ""}</Text>
            <Text style={S.approvalLabel}>PO Number</Text>
            <Text style={S.approvalValueLast}>{req.po_id ?? ""}</Text>
          </View>
          <View style={S.approvalRowLast}>
            <Text style={S.approvalLabel}>Approved Date</Text>
            <Text style={S.approvalValue}>
              {req.approved_at ? new Date(req.approved_at).toLocaleDateString("en-IN") : ""}
            </Text>
            <Text style={S.approvalLabel}>Remarks</Text>
            <Text style={S.approvalValueLast}>{req.rejected_reason ?? ""}</Text>
          </View>
        </View>

        {/* ── Signatures ── */}
        <View style={S.signatureRow}>
          <View style={S.signatureBlock}>
            <Text style={S.signatureLabel}>Prepared By</Text>
            <Text style={S.signatureName}>{req.requested_by_name ?? req.requested_by}</Text>
          </View>
          <View style={S.signatureBlock}>
            <Text style={S.signatureLabel}>Approved By</Text>
            <Text style={S.signatureName}>{req.approved_by_name ?? ""}</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <Text style={S.footer}>
          This is a computer generated Requisition Slip and does not require a signature if digitally verified.
        </Text>

      </Page>
    </Document>
  );
}
