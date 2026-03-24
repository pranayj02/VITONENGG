import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AutoPrint from "@/components/AutoPrint";
import InvoiceDocument, {
  type InvoicePreview,
  type InvoiceLine,
  type DispatchMeta,
} from "@/components/InvoiceDocument";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string | null;
  buyers_po_number?: string | null;
  fy_label?: string | null;
  fy_serial?: number | null;
  status?: string | null;
  buyer_id?: string | null;
  buyer_name?: string | null;
  buyer_display_name?: string | null;
  buyer_company_name?: string | null;
  buyer_branch_name?: string | null;
  buyer_gstin?: string | null;
  buyer_address?: string | null;
  buyer_state?: string | null;
  buyer_state_code?: string | null;
  notes?: string | null;
  line_items?: unknown;
  dispatch_meta?: unknown;
  subtotal?: number | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  total?: number | null;
  signed_by?: string | null;
  signed_at?: string | null;
  created_at?: string | null;
};

function normalizeLine(row: any): InvoiceLine {
  const quantity = Number(row?.quantity ?? 1);
  const unitRate = Number(row?.unit_rate ?? 0);

  return {
    buyer_po_sr_no: String(row?.buyer_po_sr_no ?? ""),
    buyer_item_code: String(row?.buyer_item_code ?? ""),
    description: String(row?.description ?? ""),
    hsn_code: String(row?.hsn_code ?? "84818030"),
    quantity,
    unit: String(row?.unit ?? "Nos."),
    unit_rate: unitRate,
    taxable_value: Number(
      row?.taxable_value !== undefined && row?.taxable_value !== null
        ? row.taxable_value
        : quantity * unitRate
    ),
    gst_rate: Number(row?.gst_rate ?? 18),
  };
}

function normalizeDispatchMeta(row: any): DispatchMeta {
  return {
    place_of_supply: String(row?.place_of_supply ?? ""),
    po_date: String(row?.po_date ?? ""),
    date_time_of_supply: String(row?.date_time_of_supply ?? ""),
    documents_through: String(row?.documents_through ?? ""),
    transportation: String(row?.transportation ?? ""),
    lr_no: String(row?.lr_no ?? ""),
    mode_of_dispatch: String(row?.mode_of_dispatch ?? ""),
    vehicle_no: String(row?.vehicle_no ?? ""),
    freight_packing: Number(row?.freight_packing ?? 0),
    other_charges: Number(row?.other_charges ?? 0),
    billed_to: String(row?.billed_to ?? ""),
    shipped_to: String(row?.shipped_to ?? ""),
  };
}

function toPreviewInvoice(row: InvoiceRow): InvoicePreview {
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    invoice_date: row.invoice_date || "",
    buyers_po_number: row.buyers_po_number || null,
    fy_label: row.fy_label || null,
    fy_serial: row.fy_serial || null,
    status: row.status || "draft",
    buyer: {
      name:
        row.buyer_company_name ||
        row.buyer_display_name ||
        row.buyer_name ||
        "—",
      display_name: row.buyer_display_name || row.buyer_name || null,
      company_name:
        row.buyer_company_name ||
        row.buyer_display_name ||
        row.buyer_name ||
        null,
      branch_name: row.buyer_branch_name || null,
      address: row.buyer_address || null,
      gstin: row.buyer_gstin || null,
      state: row.buyer_state || null,
      state_code: row.buyer_state_code || null,
    },
    line_items: Array.isArray(row.line_items)
      ? row.line_items.map(normalizeLine)
      : [],
    subtotal: Number(row.subtotal || 0),
    cgst: Number(row.cgst || 0),
    sgst: Number(row.sgst || 0),
    igst: Number(row.igst || 0),
    total: Number(row.total || 0),
    notes: row.notes || null,
    signed_by: row.signed_by || "Authorised Signatory",
    signed_at: row.signed_at || null,
    dispatch_meta: normalizeDispatchMeta(row.dispatch_meta),
  };
}

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const invoice = toPreviewInvoice(data as InvoiceRow);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        html, body {
          background: white;
        }

        @media print {
          html, body {
            background: white !important;
          }
        }
      `}</style>

      <AutoPrint />

      <div className="bg-white">
        <InvoiceDocument invoice={invoice} />
      </div>
    </div>
  );
}
