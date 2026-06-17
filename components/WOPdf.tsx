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
const TEXT_MID = "#444444";

// ── Column widths (landscape A4 ≈ 842pt, 16pt margins each side = 810pt usable) ──
// Delivery column removed; freed pts redistributed to text-heavy cols
const COLS = {
  sr: 16,
  poSr: 22,
  valveSr: 46,
  material: 40,
  valve: 26,
  type: 42,      // +6
  bore: 16,
  sizeMm: 20,
  rating: 20,
  endConn: 30,
  body: 44,      // +8
  wedge: 52,     // +8
  stem: 28,
  seat: 42,      // +6
  gasket: 38,    // +2
  glPkng: 26,
  fasteners: 26,
  operation: 30,
  special: 38,   // +2
  remarks: 46,   // +2
  drawing: 26,
  qty: 18,
  // delivery removed
};

const TOTAL_WIDTH = Object.values(COLS).reduce((a, b) => a + b, 0);

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

  // ── Letterhead ──────────────────────────────────────────────────
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
  logo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  companyName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: TEXT_DARK,
  },

  // ── WO Box ──────────────────────────────────────────────────────
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

  // ── Meta Grid ───────────────────────────────────────────────────
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

  // ── Table ───────────────────────────────────────────────────────
  tableWrap: {
    width: TOTAL_WIDTH,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND,
    paddingVertical: 3,
    paddingHorizontal: 2,
    minHeight: 14,
    alignItems: "center",
  },
  tableHeaderCell: {
    fontSize: 5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textAlign: "center",
    paddingHorizontal: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d0d0d0",
    paddingVertical: 2,
    paddingHorizontal: 2,
    minHeight: 12,
    alignItems: "flex-start",
  },
  tableRowAlt: {
    backgroundColor: "#fafafa",
  },
  tableCell: {
    fontSize: 5,
    color: TEXT_DARK,
    paddingHorizontal: 1,
    textAlign: "center",
  },
  tableCellLeft: {
    fontSize: 5,
    color: TEXT_DARK,
    paddingHorizontal: 1,
    textAlign: "left",
  },
  tableCellMono: {
    fontSize: 4.5,
    fontFamily: "Helvetica",
    color: "#2a3a6a",
    paddingHorizontal: 1,
    textAlign: "center",
  },
});

function HeaderCell({ children, width }: { children: React.ReactNode; width: number }) {
  return (
    <View style={{ width, flexShrink: 0, justifyContent: "center" }}>
      <Text style={S.tableHeaderCell}>{children}</Text>
    </View>
  );
}

function Cell({ children, width, left, mono }: { children: React.ReactNode; width: number; left?: boolean; mono?: boolean }) {
  return (
    <View style={{ width, flexShrink: 0 }}>
      <Text style={mono ? S.tableCellMono : left ? S.tableCellLeft : S.tableCell} wrap>
        {children}
      </Text>
    </View>
  );
}

export function WOPdfDocument({ wo }: { wo: WorkOrder & { items: WorkOrderItem[] } }) {
  const items = wo.items ?? [];

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>
        {/* ── Letterhead: logo + company name + WO box only ── */}
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

        {/* ── Meta Fields ── */}
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

        {/* ── Items Table ── */}
        <View style={S.tableWrap}>
          <View style={S.tableHeader}>
            <HeaderCell width={COLS.sr}>Sr.{"\n"}No.</HeaderCell>
            <HeaderCell width={COLS.poSr}>P.O.{"\n"}SR.NO.</HeaderCell>
            <HeaderCell width={COLS.valveSr}>VALVE{"\n"}SR.NO.</HeaderCell>
            <HeaderCell width={COLS.material}>Material{"\n"}No.</HeaderCell>
            <HeaderCell width={COLS.valve}>Valve</HeaderCell>
            <HeaderCell width={COLS.type}>Type</HeaderCell>
            <HeaderCell width={COLS.bore}>Bore</HeaderCell>
            <HeaderCell width={COLS.sizeMm}>Size{"\n"}MM</HeaderCell>
            <HeaderCell width={COLS.rating}>Rating</HeaderCell>
            <HeaderCell width={COLS.endConn}>End{"\n"}Conn.</HeaderCell>
            <HeaderCell width={COLS.body}>Body /{"\n"}Bonnet</HeaderCell>
            <HeaderCell width={COLS.wedge}>Wedge / Disc /{"\n"}Plug / Ball</HeaderCell>
            <HeaderCell width={COLS.stem}>Stem /{"\n"}Hinge</HeaderCell>
            <HeaderCell width={COLS.seat}>Seat</HeaderCell>
            <HeaderCell width={COLS.gasket}>Gasket</HeaderCell>
            <HeaderCell width={COLS.glPkng}>GL.{"\n"}PKNG.</HeaderCell>
            <HeaderCell width={COLS.fasteners}>Fasteners</HeaderCell>
            <HeaderCell width={COLS.operation}>Operation</HeaderCell>
            <HeaderCell width={COLS.special}>Special{"\n"}Req.</HeaderCell>
            <HeaderCell width={COLS.remarks}>Remarks</HeaderCell>
            <HeaderCell width={COLS.drawing}>Drawing{"\n"}No.</HeaderCell>
            <HeaderCell width={COLS.qty}>Qty</HeaderCell>
          </View>

          {items.map((item, i) => (
            <View key={i} style={[S.tableRow, i % 2 !== 0 ? S.tableRowAlt : {}]}>
              <Cell width={COLS.sr}>{item.sr_no}</Cell>
              <Cell width={COLS.poSr}>{item.po_sr_no}</Cell>
              <Cell width={COLS.valveSr} mono>{item.valve_sr_no}</Cell>
              <Cell width={COLS.material} mono>{item.material_no}</Cell>
              <Cell width={COLS.valve}>{item.valve}</Cell>
              <Cell width={COLS.type} left>{item.type}</Cell>
              <Cell width={COLS.bore}>{item.bore}</Cell>
              <Cell width={COLS.sizeMm}>{item.size_mm}</Cell>
              <Cell width={COLS.rating}>{item.rating}</Cell>
              <Cell width={COLS.endConn}>{item.end_connection}</Cell>
              <Cell width={COLS.body} left>{item.body_bonnet}</Cell>
              <Cell width={COLS.wedge} left>{item.wedge_disc_plug_ball}</Cell>
              <Cell width={COLS.stem}>{item.stem_hinge}</Cell>
              <Cell width={COLS.seat} left>{item.seat}</Cell>
              <Cell width={COLS.gasket} left>{item.gasket}</Cell>
              <Cell width={COLS.glPkng}>{item.gl_pkng}</Cell>
              <Cell width={COLS.fasteners}>{item.fasteners}</Cell>
              <Cell width={COLS.operation}>{item.operation}</Cell>
              <Cell width={COLS.special} left>{item.special_requirements}</Cell>
              <Cell width={COLS.remarks} left>{item.remarks}</Cell>
              <Cell width={COLS.drawing} mono>{item.drawing_no}</Cell>
              <Cell width={COLS.qty}>{item.qty}</Cell>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
