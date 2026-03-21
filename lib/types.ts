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
  created_at: string;
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
