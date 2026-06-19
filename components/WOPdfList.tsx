import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { WorkOrder, WorkOrderItem } from "@/lib/types";

const BRAND = "#1a2744";
const ACCENT = "#c41e3a";
const TEXT_DARK = "#111111";
const COL_BORDER = "#b8b8b8";

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 7,
    color: TEXT_DARK,
    padding: 20,
    backgroundColor: "#ffffff",
  },
  header: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
    paddingBottom: 6,
  },
  subHeader: {
    fontSize: 9,
    color: "#555",
    marginBottom: 10,
  },
  table: {
    width: "100%",
    borderWidth: 0.5,
    borderColor: COL_BORDER,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND,
    minHeight: 20,
    alignItems: "center",
  },
  tableHeaderCell: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textAlign: "center",
    paddingHorizontal: 2,
    paddingVertical: 3,
    borderRightWidth: 0.5,
    borderRightColor: "rgba(255,255,255,0.15)",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: COL_BORDER,
    minHeight: 16,
    alignItems: "center",
  },
  tableCell: {
    fontSize: 5,
    color: TEXT_DARK,
    paddingHorizontal: 2,
    paddingVertical: 2,
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: COL_BORDER,
  },
  cellLeft: {
    textAlign: "left",
  },
  woSeparator: {
    borderTopWidth: 1.5,
    borderTopColor: COL_BORDER,
    backgroundColor: "#f8f9fa",
  },
  completedRow: {
    backgroundColor: "#f0f9f0",
  },
  completedText: {
    color: "#888",
    textDecoration: "line-through",
  },
  footer: {
    marginTop: 10,
    fontSize: 7,
    color: "#888",
    textAlign: "center",
  },
});

function Cell({
  children,
  width,
  last,
  left,
  completed,
}: {
  children: React.ReactNode;
  width: number;
  last?: boolean;
  left?: boolean;
  completed?: boolean;
}) {
  return (
    <Text
      style={[
        S.tableCell,
        left ? S.cellLeft : {},
        completed ? S.completedText : {},
        last ? { borderRightWidth: 0 } : {},
      ]}
      wrap
    >
      {children}
    </Text>
  );
}

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
    <Text
      style={[
        S.tableHeaderCell,
        { width },
        last ? { borderRightWidth: 0 } : {},
      ]}
    >
      {children}
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
  const COLS = {
    wo: 50,
    customer: 70,
    poSr: 35,
    size: 30,
    class: 30,
    valve: 40,
    desc: 110,
    qty: 25,
    dueDate: 40,
    inspection: 45,
    poNo: 70,
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>
        <Text style={S.header}>Work Orders Summary</Text>
        <Text style={S.subHeader}>
          Generated on {generatedAt} · {orders.length} work orders
        </Text>

        <View style={S.table}>
          <View style={S.tableHeader}>
            <HeaderCell width={COLS.wo}>WO NO.</HeaderCell>
            <HeaderCell width={COLS.customer}>Customer</HeaderCell>
            <HeaderCell width={COLS.poSr}>PO SR</HeaderCell>
            <HeaderCell width={COLS.size}>Size</HeaderCell>
            <HeaderCell width={COLS.class}>Class</HeaderCell>
            <HeaderCell width={COLS.valve}>Valve</HeaderCell>
            <HeaderCell width={COLS.desc}>Description</HeaderCell>
            <HeaderCell width={COLS.qty}>Qty</HeaderCell>
            <HeaderCell width={COLS.dueDate}>Due Date</HeaderCell>
            <HeaderCell width={COLS.inspection}>Inspection</HeaderCell>
            <HeaderCell width={COLS.poNo} last>P.O. NO.</HeaderCell>
          </View>

          {orders.map((wo) => {
            const items = wo.items ?? [];
            const isCompleted = !!wo.is_completed;
            return items.length === 0 ? (
              <View key={wo.id} style={[S.tableRow, S.woSeparator]}>
                <Cell width={COLS.wo} completed={isCompleted}>
                  {wo.wo_number}
                </Cell>
                <Cell width={COLS.customer} completed={isCompleted}>
                  {wo.party_name || "—"}
                </Cell>
                <Cell width={COLS.poSr}>-</Cell>
                <Cell width={COLS.size}>-</Cell>
                <Cell width={COLS.class}>-</Cell>
                <Cell width={COLS.valve}>-</Cell>
                <Cell width={COLS.desc}>-</Cell>
                <Cell width={COLS.qty}>-</Cell>
                <Cell width={COLS.dueDate} completed={isCompleted}>
                  {wo.delivery_date || "—"}
                </Cell>
                <Cell width={COLS.inspection} completed={isCompleted}>
                  {wo.inspection_by || "—"}
                </Cell>
                <Cell width={COLS.poNo} last completed={isCompleted}>
                  {wo.po_no ? `${wo.po_no}${wo.po_date ? ` / ${wo.po_date}` : ""}` : "—"}
                </Cell>
              </View>
            ) : (
              items.map((item, idx) => (
                <View
                  key={`${wo.id}-${idx}`}
                  style={[
                    S.tableRow,
                    idx === 0 ? S.woSeparator : {},
                    isCompleted ? S.completedRow : {},
                  ]}
                >
                  {idx === 0 ? (
                    <Cell width={COLS.wo} completed={isCompleted}>
                      {wo.wo_number}
                    </Cell>
                  ) : (
                    <Cell width={COLS.wo} />
                  )}
                  {idx === 0 ? (
                    <Cell width={COLS.customer} completed={isCompleted}>
                      {wo.party_name || "—"}
                    </Cell>
                  ) : (
                    <Cell width={COLS.customer} />
                  )}
                  <Cell width={COLS.poSr}>{item.po_sr_no || "—"}</Cell>
                  <Cell width={COLS.size}>{item.size_mm ? `${item.size_mm}"` : "—"}</Cell>
                  <Cell width={COLS.class}>{item.rating || "—"}</Cell>
                  <Cell width={COLS.valve}>{item.valve || "—"}</Cell>
                  <Cell width={COLS.desc} left>
                    {[
                      item.body_bonnet,
                      item.wedge_disc_plug_ball,
                      item.special_requirements,
                    ].filter(Boolean).join(", ") || "—"}
                  </Cell>
                  <Cell width={COLS.qty}>{item.qty || "—"}</Cell>
                  {idx === 0 ? (
                    <Cell width={COLS.dueDate} completed={isCompleted}>
                      {wo.delivery_date || "—"}
                    </Cell>
                  ) : (
                    <Cell width={COLS.dueDate} />
                  )}
                  {idx === 0 ? (
                    <Cell width={COLS.inspection} completed={isCompleted}>
                      {wo.inspection_by || "—"}
                    </Cell>
                  ) : (
                    <Cell width={COLS.inspection} />
                  )}
                  {idx === 0 ? (
                    <Cell width={COLS.poNo} last completed={isCompleted}>
                      {wo.po_no ? `${wo.po_no}${wo.po_date ? ` / ${wo.po_date}` : ""}` : "—"}
                    </Cell>
                  ) : (
                    <Cell width={COLS.poNo} last />
                  )}
                </View>
              ))
            );
          })}
        </View>

        <Text style={S.footer}>
          This is a computer-generated report from VITON ERP.
        </Text>
      </Page>
    </Document>
  );
}
