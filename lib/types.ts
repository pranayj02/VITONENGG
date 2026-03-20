export type Item = {
  id: string;
  serial_id: string;
  name: string;
  description: string | null;
  specs: Record<string, string> | null;
  hsn_code: string | null;
  unit: string;
  category: string | null;
  created_at: string;
};

export type Vendor = {
  id: string;
  name: string;
  gstin: string | null;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  payment_terms: string | null;
  created_at: string;
};

export type LineItem = {
  item_id: string;
  serial_id: string;
  name: string;
  hsn_code: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type PurchaseOrder = {
  id: string;
  po_number: string;
  vendor_id: string;
  status: string;
  line_items: LineItem[];
  subtotal: number;
  total: number;
  notes: string | null;
  created_at: string;
  vendor?: Vendor;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  buyer_name: string;
  buyer_gstin: string | null;
  buyer_address: string | null;
  line_items: LineItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  notes: string | null;
  created_at: string;
};
