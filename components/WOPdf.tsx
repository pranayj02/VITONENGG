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
const BORDER = "#b0b0b0";
const LIGHT_BG = "#f5f5f5";
const TEXT_DARK = "#111111";
const TEXT_MID = "#444444";

// ── Column widths (landscape A4 ≈ 842pt, margins 16pt each side = 810pt usable) ──
const COLS = {
  sr: 16,
  poSr: 22,
  valveSr: 44,
  material: 38,
  valve: 24,
  type: 36,
  bore: 16,
  sizeMm: 20,
  rating: 20,
  endConn: 28,
  body: 36,
  wedge: 44,
  stem: 28,
  seat: 36,
  gasket: 36,
  glPkng: 24,
  fasteners: 24,
  operation: 28,
  special: 36,
  remarks: 44,
  drawing: 26,
  qty: 18,
  delivery: 30,
};

const TOTAL_WIDTH = Object.values(COLS).reduce((a, b) => a + b, 0);

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 6,
    color: TEXT_DARK,
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: "#ffffff",
  },

  // ── Letterhead ──────────────────────────────────────────────────
  letterhead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
    marginBottom: 8,
  },
  letterheadLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: 8,
  },
  companyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: TEXT_DARK,
    marginBottom: 1,
  },
  companyDetail: {
    fontSize: 5.5,
    color: TEXT_MID,
    lineHeight: 1.4,
  },

  // ── WO Box ──────────────────────────────────────────────────────
  woBox: {
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignItems: "center",
    minWidth: 120,
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
    fontSize: 6,
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

  // ── Footer ──────────────────────────────────────────────────────
  footer: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#cccccc",
    paddingTop: 4,
  },
  footerBox: {
    width: "30%",
    minHeight: 40,
    borderTopWidth: 0.5,
    borderTopColor: "#999999",
    paddingTop: 2,
  },
  footerLabel: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: TEXT_MID,
    textAlign: "center",
  },
  disclaimer: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 5,
    color: "#888888",
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
        {/* ── Letterhead ── */}
        <View style={S.letterhead}>
          <View style={S.letterheadLeft}>
            <Image src="/Logo.JPG" style={S.logo} />
            <View style={{ flex: 1 }}>
              <Text style={S.companyName}>VITON ENGINEERS PVT. LTD.</Text>
              <Text style={S.companyDetail}>
                WORKS: B40/1, ADDL. Ambernath MIDC, Anand Nagar, Opp. Hali Pad,{"\n"}
                Ambernath East, Dist. Thane - 421506{"  "}|{"  "}Tel: 08779301215 / 9769639388{"  "}|{"  "}Email: info@vitonvalves.com
              </Text>
            </View>
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
            <Text style={S.metaValueBold}>{wo.party_name || "—"}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>Delivery</Text>
            <Text style={S.metaColon}>:</Text>
            <Text style={S.metaValue}>{wo.delivery_date || "—"}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>P.O. No.</Text>
            <Text style={S.metaColon}>:</Text>
            <Text style={S.metaValue}>{wo.po_no || "—"}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>PO Date</Text>
            <Text style={S.metaColon}>:</Text>
            <Text style={S.metaValue}>{wo.po_date || "—"}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>Inspection By</Text>
            <Text style={S.metaColon}>:</Text>
            <Text style={S.metaValue}>{wo.inspection_by || "NO"}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>QAP No.</Text>
            <Text style={S.metaColon}>:</Text>
            <Text style={S.metaValue}>{wo.qap_no || "—"}</Text>
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
            <HeaderCell width={COLS.delivery}>Delivery</HeaderCell>
          </View>

          {items.map((item, i) => (
            <View key={item.id || i} style={[S.tableRow, i % 2 !== 0 ? S.tableRowAlt : {}]}>
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
              <Cell width={COLS.delivery}>{item.delivery}</Cell>
            </View>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={S.footer}>
          <View style={S.footerBox}>
            <Text style={S.footerLabel}>Prepared By</Text>
          </View>
          <View style={S.footerBox}>
            <Text style={S.footerLabel}>Checked By</Text>
          </View>
          <View style={S.footerBox}>
            <Text style={S.footerLabel}>Approved By</Text>
          </View>
        </View>

        <Text style={S.disclaimer}>
          This is a computer generated Work Order and does not require a signature.
        </Text>
      </Page>
    </Document>
  );
}
