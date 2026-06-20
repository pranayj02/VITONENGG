import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { WorkOrder, WorkOrderItem } from "@/lib/types";

const BRAND = "#1a2744";
const ACCENT = "#c41e3a";
const TEXT_DARK = "#111111";
const COL_BORDER = "#b8b8b8";

// Landscape A4: 842pt wide, 16pt margins each side = 810pt usable
// wedge ↔ remarks swapped: remarks gets 63, wedge gets 54
const COLS = {
  sr: 19,
  poSr: 26,
  valveSr: 54,
  material: 47,
  valve: 30,
  type: 49,
  bore: 19,
  sizeMm: 23,
  rating: 23,
  endConn: 35,
  body: 52,
  wedge: 54,      // was 63, swapped with remarks
  stem: 33,
  seat: 49,
  gasket: 44,
  glPkng: 30,
  fasteners: 30,
  operation: 35,
  special: 44,
  remarks: 63,    // was 54, swapped with wedge
  drawing: 30,
  qty: 21,
};

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 6,
    color: TEXT_DARK,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: "#ffffff",
  },
  letterhead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
    marginBottom: 7,
  },
  letterheadLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logo: { width: 32, height: 32, marginRight: 8 },
  companyName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: TEXT_DARK,
  },
  woBox: {
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignItems: "center",
    minWidth: 110,
  },
  woBoxTitleWrap: {
    backgroundColor: ACCENT,
    width: "100%",
    borderRadius: 2,
    paddingVertical: 3,
    alignItems: "center",
  },
  woBoxTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  woBoxNumber: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
    marginTop: 3,
    textAlign: "center",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
    gap: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 180,
  },
  metaLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    width: 80,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metaColon: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    width: 8,
  },
  metaValue: {
    fontSize: 6,
    fontFamily: "Helvetica",
    color: TEXT_DARK,
    flex: 1,
  },
  metaValueBold: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: TEXT_DARK,
    flex: 1,
  },
  tableWrap: {
    width: "100%",
    borderWidth: 0.5,
    borderColor: COL_BORDER,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND,
    minHeight: 16,
    alignItems: "stretch",
  },
  tableHeaderCell: {
    fontSize: 4.8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textAlign: "center",
    paddingHorizontal: 1,
    paddingVertical: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: COL_BORDER,
    minHeight: 14,
    alignItems: "stretch",
  },
  tableRowAlt: {
    backgroundColor: "#f5f7fb",
  },
  tableCell: {
    fontSize: 5,
    color: TEXT_DARK,
    paddingHorizontal: 2,
    paddingVertical: 2,
    textAlign: "center",
  },
  tableCellMono: {
    fontSize: 4.5,
    fontFamily: "Helvetica",
    color: "#2a3a6a",
    paddingHorizontal: 2,
    paddingVertical: 2,
    textAlign: "center",
  },
});

// Shared column separator style applied to every cell except the last
const SEP = {
  borderRightWidth: 0.5,
  borderRightColor: COL_BORDER,
};

function HeaderCell({
  children,
  width,
  last,
}: {
  children: React.ReactNode;
  width: number;
  last?: boolean;
}) {
  return (
    <View
      style={[
        { width, flexShrink: 0, justifyContent: "center", alignItems: "center" },
        last ? {} : SEP,
      ]}
    >
      <Text style={S.tableHeaderCell}>{children}</Text>
    </View>
  );
}

function Cell({
  children,
  width,
  mono,
  last,
}: {
  children: React.ReactNode;
  width: number;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[{ width, flexShrink: 0, justifyContent: "center" }, last ? {} : SEP]}>
      <Text style={mono ? S.tableCellMono : S.tableCell} wrap>
        {children ?? ""}
      </Text>
    </View>
  );
}

export function WOPdfDocument({
  wo,
}: {
  wo: WorkOrder & { items: WorkOrderItem[] };
}) {
  const items = wo.items ?? [];

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>
        {/* Letterhead */}
        <View style={S.letterhead}>
          <View style={S.letterheadLeft}>
            <Image src="/Logo.JPG" style={S.logo} />
            <Text style={S.companyName}>VITON ENGINEERS PVT. LTD.</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={S.woBox}>
              <View style={S.woBoxTitleWrap}>
                <Text style={S.woBoxTitle}>Work Order</Text>
              </View>
              <Text style={S.woBoxNumber}>{wo.wo_number}</Text>
            </View>
          </View>
        </View>

        {/* Meta */}
        <View style={S.metaGrid}>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>Party Name</Text>
            <Text style={S.metaColon}>:</Text>
            <Text style={S.metaValueBold}>{wo.party_name || "\u2014"}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>Delivery</Text>
            <Text style={S.metaColon}>:</Text>
            <Text style={S.metaValue}>{wo.delivery_date || "\u2014"}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>P.O. No.</Text>
            <Text style={S.metaColon}>:</Text>
            <Text style={S.metaValue}>{wo.po_no || "\u2014"}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>PO Date</Text>
            <Text style={S.metaColon}>:</Text>
            <Text style={S.metaValue}>{wo.po_date || "\u2014"}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>Inspection By</Text>
            <Text style={S.metaColon}>:</Text>
            <Text style={S.metaValue}>{wo.inspection_by || "NO"}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>QAP No.</Text>
            <Text style={S.metaColon}>:</Text>
            <Text style={S.metaValue}>{wo.qap_no || "\u2014"}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={S.tableWrap}>
          <View style={S.tableHeader}>
            <HeaderCell width={COLS.sr}>{"Sr.\nNo."}</HeaderCell>
            <HeaderCell width={COLS.poSr}>{"P.O.\nSR.NO."}</HeaderCell>
            <HeaderCell width={COLS.valveSr}>{"VALVE\nSR.NO."}</HeaderCell>
            <HeaderCell width={COLS.material}>{"Material\nNo."}</HeaderCell>
            <HeaderCell width={COLS.valve}>Valve</HeaderCell>
            <HeaderCell width={COLS.type}>Type</HeaderCell>
            <HeaderCell width={COLS.bore}>Bore</HeaderCell>
            <HeaderCell width={COLS.sizeMm}>{"Size\nMM"}</HeaderCell>
            <HeaderCell width={COLS.rating}>Rating</HeaderCell>
            <HeaderCell width={COLS.endConn}>{"End\nConn."}</HeaderCell>
            <HeaderCell width={COLS.body}>{"Body /\nBonnet"}</HeaderCell>
            <HeaderCell width={COLS.wedge}>{"Wedge / Disc /\nPlug / Ball"}</HeaderCell>
            <HeaderCell width={COLS.stem}>{"Stem /\nHinge"}</HeaderCell>
            <HeaderCell width={COLS.seat}>Seat</HeaderCell>
            <HeaderCell width={COLS.gasket}>Gasket</HeaderCell>
            <HeaderCell width={COLS.glPkng}>{"GL.\nPKNG."}</HeaderCell>
            <HeaderCell width={COLS.fasteners}>Fasteners</HeaderCell>
            <HeaderCell width={COLS.operation}>Operation</HeaderCell>
            <HeaderCell width={COLS.special}>{"Special\nReq."}</HeaderCell>
            <HeaderCell width={COLS.remarks}>Remarks</HeaderCell>
            <HeaderCell width={COLS.drawing}>{"Drawing\nNo."}</HeaderCell>
            <HeaderCell width={COLS.qty} last>Qty</HeaderCell>
          </View>

          {items.map((item, i) => (
            <View key={i} style={[S.tableRow, i % 2 !== 0 ? S.tableRowAlt : {}]}>
              <Cell width={COLS.sr}>{item.sr_no}</Cell>
              <Cell width={COLS.poSr}>{item.po_sr_no}</Cell>
              <Cell width={COLS.material} mono>{item.material_no}</Cell>
              <Cell width={COLS.valve}>{item.valve}</Cell>
              <Cell width={COLS.type}>{item.type}</Cell>
              <Cell width={COLS.bore}>{item.bore}</Cell>
              <Cell width={COLS.sizeMm}>{item.size_mm}</Cell>
              <Cell width={COLS.rating}>{item.rating}</Cell>
              <Cell width={COLS.endConn}>{item.end_connection}</Cell>
              <Cell width={COLS.body}>{item.body_bonnet}</Cell>
              <Cell width={COLS.wedge}>{item.wedge_disc_plug_ball}</Cell>
              <Cell width={COLS.stem}>{item.stem_hinge}</Cell>
              <Cell width={COLS.seat}>{item.seat}</Cell>
              <Cell width={COLS.gasket}>{item.gasket}</Cell>
              <Cell width={COLS.glPkng}>{item.gl_pkng}</Cell>
              <Cell width={COLS.fasteners}>{item.fasteners}</Cell>
              <Cell width={COLS.operation}>{item.operation}</Cell>
              <Cell width={COLS.special}>{item.special_requirements}</Cell>
              <Cell width={COLS.remarks}>{item.remarks}</Cell>
              <Cell width={COLS.drawing} mono>{item.drawing_no}</Cell>
              <Cell width={COLS.qty} last>{item.qty}</Cell>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
