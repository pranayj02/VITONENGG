import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { WorkOrder, WorkOrderItem } from "@/lib/types";

const BRAND  = "#1a2744";
const ACCENT = "#c41e3a";
const DARK   = "#111111";
const BORDER = "#cccccc";

// A4 landscape usable width ≈ 801pt (841 - 40 padding)
// Column widths must sum to exactly this.
const COLS = {
  wo:         52,
  customer:   80,
  poSr:       28,
  size:       28,
  cls:        28,
  valve:      45,
  desc:      170,
  qty:        22,
  dueDate:    42,
  inspection: 50,
  poNo:      156,
};

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 7,
    color: DARK,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "#ffffff",
  },
  header: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    marginBottom: 4,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  subHeader: {
    fontSize: 7.5,
    color: "#555",
    marginBottom: 10,
  },
  table: {
    width: "100%",
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: BRAND,
    alignItems: "stretch",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    alignItems: "stretch",
    minHeight: 16,
  },
  woFirstRow: {
    borderTopWidth: 1.5,
    borderTopColor: "#888",
    backgroundColor: "#f8f9fa",
  },
  completedRow: { backgroundColor: "#f0f9f0" },
  hCell: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    paddingHorizontal: 2,
    paddingVertical: 3,
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: "rgba(255,255,255,0.2)",
  },
  cell: {
    fontSize: 6,
    color: DARK,
    paddingHorizontal: 2,
    paddingVertical: 2,
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: BORDER,
  },
  cellLeft:      { textAlign: "left" },
  cellCompleted: { color: "#999", textDecoration: "line-through" },
  cellLast:      { borderRightWidth: 0 },
  footer: {
    marginTop: 10,
    fontSize: 6.5,
    color: "#999",
    textAlign: "center",
  },
});

function HC({ children, w, last }: { children: string; w: number; last?: boolean }) {
  return (
    <Text style={[S.hCell, { width: w }, last ? S.cellLast : {}]}>
      {children}
    </Text>
  );
}

function C({
  children, w, last, left, done,
}: {
  children?: React.ReactNode;
  w: number;
  last?: boolean;
  left?: boolean;
  done?: boolean;
}) {
  return (
    <Text
      style={[
        S.cell,
        { width: w },
        left  ? S.cellLeft      : {},
        done  ? S.cellCompleted : {},
        last  ? S.cellLast      : {},
      ]}
    >
      {children ?? ""}
    </Text>
  );
}

export function WOPdfListDocument({
  orders,
  generatedAt,
}: {
  orders: (WorkOrder & { items: WorkOrderItem[] })[];
  generatedAt: string;
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>
        <Text style={S.header}>Work Orders Summary</Text>
        <Text style={S.subHeader}>
          Generated on {generatedAt} · {orders.length} work order{orders.length !== 1 ? "s" : ""}
        </Text>

        <View style={S.table}>
          {/* Header */}
          <View style={S.tableHeaderRow}>
            <HC w={COLS.wo}>WO NO.</HC>
            <HC w={COLS.customer}>Customer</HC>
            <HC w={COLS.poSr}>PO SR</HC>
            <HC w={COLS.size}>Size</HC>
            <HC w={COLS.cls}>Class</HC>
            <HC w={COLS.valve}>Valve</HC>
            <HC w={COLS.desc}>Description</HC>
            <HC w={COLS.qty}>Qty</HC>
            <HC w={COLS.dueDate}>Due Date</HC>
            <HC w={COLS.inspection}>Inspection</HC>
            <HC w={COLS.poNo} last>P.O. NO.</HC>
          </View>

          {/* Rows */}
          {orders.map((wo) => {
            const items = wo.items ?? [];
            const done  = !!wo.is_completed;
            const poStr = wo.po_no
              ? `${wo.po_no}${wo.po_date ? ` / ${wo.po_date}` : ""}`
              : "—";

            if (items.length === 0) {
              return (
                <View key={wo.id} style={[S.tableRow, S.woFirstRow, done ? S.completedRow : {}]}>
                  <C w={COLS.wo}         done={done}>{wo.wo_number}</C>
                  <C w={COLS.customer}   done={done} left>{wo.party_name || "—"}</C>
                  <C w={COLS.poSr}>—</C>
                  <C w={COLS.size}>—</C>
                  <C w={COLS.cls}>—</C>
                  <C w={COLS.valve}>—</C>
                  <C w={COLS.desc}>—</C>
                  <C w={COLS.qty}>—</C>
                  <C w={COLS.dueDate}    done={done}>{wo.delivery_date || "—"}</C>
                  <C w={COLS.inspection} done={done}>{wo.inspection_by || "—"}</C>
                  <C w={COLS.poNo} last  done={done} left>{poStr}</C>
                </View>
              );
            }

            return items.map((item, idx) => {
              const isFirst = idx === 0;
              const desc = [item.body_bonnet, item.wedge_disc_plug_ball, item.special_requirements]
                .filter(Boolean)
                .join(", ") || "—";
              return (
                <View
                  key={`${wo.id}-${idx}`}
                  style={[
                    S.tableRow,
                    isFirst ? S.woFirstRow : {},
                    done ? S.completedRow : {},
                  ]}
                >
                  <C w={COLS.wo}         done={isFirst && done}>{isFirst ? wo.wo_number : ""}</C>
                  <C w={COLS.customer}   done={isFirst && done} left>{isFirst ? (wo.party_name || "—") : ""}</C>
                  <C w={COLS.poSr}>{item.po_sr_no || "—"}</C>
                  <C w={COLS.size}>{item.size_mm ? `${item.size_mm}"` : "—"}</C>
                  <C w={COLS.cls}>{item.rating || "—"}</C>
                  <C w={COLS.valve}>{item.valve || "—"}</C>
                  <C w={COLS.desc} left>{desc}</C>
                  <C w={COLS.qty}>{item.qty != null ? String(item.qty) : "—"}</C>
                  <C w={COLS.dueDate}    done={isFirst && done}>{isFirst ? (wo.delivery_date || "—") : ""}</C>
                  <C w={COLS.inspection} done={isFirst && done}>{isFirst ? (wo.inspection_by || "—") : ""}</C>
                  <C w={COLS.poNo} last  done={isFirst && done} left>{isFirst ? poStr : ""}</C>
                </View>
              );
            });
          })}
        </View>

        <Text style={S.footer}>This is a computer-generated report from VITON ERP.</Text>
      </Page>
    </Document>
  );
}
