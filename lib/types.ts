export interface LineItem {
  item_id: string;
  serial_id: string;
  name: string;
  hsn_code: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
  custom_note?: string;
}

export interface Item {
  id: string;
  serial_id: string;
  name: string;
  description: string | null;
  hsn_code: string | null;
  unit: string;
  category: string | null;
  specs: Record<string, unknown> | null;
  default_rate?: number | null;
}

export interface Vendor {
  id: string;
  name: string;
  gstin: string | null;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  payment_terms: string | null;
  delivery_address?: string | null;
  delivery_gstin?: string | null;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  status: string;
  line_items: LineItem[];
  subtotal: number;
  total: number;
  notes: string | null;
  dispatch_meta: Record<string, unknown> | null;
  fy_label?: string | null;
  fy_serial?: number | null;
  quot_no?: string | null;
  quot_date?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  po_id: string | null;
  vendor_id: string;
  status: string;
  line_items: LineItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  due_date: string | null;
  created_at: string;
}

// ── ERP: Material Requisition ───────────────────────────────────────────────

export interface ReqLineItem {
  item_id: string;
  serial_id: string;
  name: string;
  unit: string;
  qty_requested: number;
  qty_approved?: number;
  custom_note?: string;
}

export interface Requisition {
  id: string;
  req_number: string;
  fy_label?: string | null;
  fy_serial?: number | null;
  requested_by: string;
  requested_by_name?: string | null;
  department?: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "under_review" | "approved" | "rejected" | "converted_to_po" | "partially_fulfilled" | "fulfilled" | "awaiting_procurement";
  line_items: ReqLineItem[];
  notes?: string | null;
  required_by?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  rejected_reason?: string | null;
  po_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// ── ERP: Goods Receipt Note ─────────────────────────────────────────────────

export interface GRNLineItem {
  item_id: string;
  serial_id: string;
  name: string;
  po_qty: number;
  received_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  rejection_reason?: string;
  unit: string;
  challan_weight?: number;
  challan_nos?: number;
  counted_nos?: number;
}

export interface GRN {
  id: string;
  grn_number: string;
  fy_label?: string | null;
  fy_serial?: number | null;
  po_id?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  received_by?: string | null;
  received_by_name?: string | null;
  inspected_by?: string | null;
  inspected_by_name?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  line_items: GRNLineItem[];
  // Approval sequence: pending -> under_review (sent for inspection) -> inspected -> approved
  // "rejected" and "partial" can be reached from under_review/inspected. "partial" is a partial-acceptance
  // outcome of the approve step (kept for compatibility with existing audit/stock logic).
  status: "pending" | "under_review" | "inspected" | "approved" | "rejected" | "partial";
  inspection_notes?: string | null;
  challan_no?: string | null;
  challan_date?: string | null;
  revision_no?: string | null;
  revision_date?: string | null;
  grn_date?: string | null;
  documents?: unknown[] | null;
  created_at: string;
  updated_at?: string | null;
}

// ── ERP: Stock Ledger ───────────────────────────────────────────────────────

export interface StockLedgerEntry {
  id: string;
  item_id: string;
  transaction_type: "grn_in" | "po_commit" | "invoice_out" | "adjustment_in" | "adjustment_out" | "return_in" | "warranty_out";
  reference_type?: string | null;
  reference_id?: string | null;
  reference_code?: string | null;
  qty_in: number;
  qty_out: number;
  balance: number;
  unit?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
}

export interface StockSummary {
  item_id: string;
  serial_id: string;
  name: string;
  category?: string | null;
  unit: string;
  total_in: number;
  total_out: number;
  balance: number;
}

// ── ERP: Work Order ─────────────────────────────────────────────────────────

export interface WorkOrderItem {
  id?: string;
  work_order_id?: string;
  sr_no: number;
  po_sr_no: string;
  material_no: string;
  valve: string;
  type: string;
  bore: string;
  size_mm: string;
  rating: string;
  end_connection: string;
  body_bonnet: string;
  wedge_disc_plug_ball: string;
  stem_hinge: string;
  seat: string;
  gasket: string;
  gl_pkng: string;
  fasteners: string;
  operation: string;
  special_requirements: string;
  remarks: string;
  drawing_no: string;
  qty: string;
  delivery: string;
  is_completed?: boolean;
}

export interface WorkOrder {
  id: string;
  wo_number: string;
  party_name: string;
  delivery_date: string | null;
  po_no: string | null;
  po_date: string | null;
  inspection_by: string | null;
  qap_no: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at?: string | null;
  is_completed?: boolean;
  items?: WorkOrderItem[];
}

// ── ERP: Activity Log ───────────────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  entity_code?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}
