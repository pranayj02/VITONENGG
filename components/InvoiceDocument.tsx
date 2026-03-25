"use client";

import { useEffect, useRef } from "react";

export type DispatchMeta = {
  place_of_supply?: string;
  po_date?: string;
  date_time_of_supply?: string;
  documents_through?: string;
  transportation?: string;
  lr_no?: string;
  mode_of_dispatch?: string;
  vehicle_no?: string;
  freight_packing?: number;
  other_charges?: number;
  billed_to?: string;
  shipped_to?: string;
};

export type InvoiceLine = {
  buyer_po_sr_no: string;
  buyer_item_code: string;
  description: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  unit_rate: number;
  taxable_value: number;
  gst_rate: number;
};

export type InvoicePreview = {
  id?: string | null;
  invoice_number: string;
  invoice_date: string;
  buyers_po_number?: string | null;
  fy_label?: string | null;
  fy_serial?: number | null;
  status: string;
  buyer: {
    name: string;
    display_name?: string | null;
    company_name?: string | null;
    branch_name?: string | null;
    address?: string | null;
    gstin?: string | null;
    state?: string | null;
    state_code?: string | null;
  };
  line_items: InvoiceLine[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  notes?: string | null;
  signed_by?: string | null;
  signed_at?: string | null;
  dispatch_meta?: DispatchMeta | null;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatMoney(value?: number | null) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function integerToWords(num: number): string {
  if (num === 0) return "ZERO";
  const ones = ["","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"];
  const tens = ["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"];

  function twoDigit(n: number): string {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`.trim();
  }
  function threeDigit(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    if (!hundred) return twoDigit(rest);
    return `${ones[hundred]} HUNDRED${rest ? ` ${twoDigit(rest)}` : ""}`.trim();
  }

  const parts: string[] = [];
  let n = num;
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000);    n %= 100000;
  const thousand = Math.floor(n / 1000);  n %= 1000;
  const last = n;

  if (crore)    parts.push(`${twoDigit(crore)} CRORE`);
  if (lakh)     parts.push(`${twoDigit(lakh)} LAKH`);
  if (thousand) parts.push(`${twoDigit(thousand)} THOUSAND`);
  if (last)     parts.push(threeDigit(last));

  return parts.join(" ").trim();
}

function amountToWords(value: number) {
  const rounded = Math.round(Number(value || 0));
  return `RS. ${integerToWords(rounded)} ONLY`;
}

const A4_HEIGHT_PX = 297 * (96 / 25.4);

export default function InvoiceDocument({
  invoice,
  className = "",
}: {
  invoice: InvoicePreview;
  className?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    el.style.transform = "";
    el.style.transformOrigin = "";
    el.style.width = "";
    const contentH = el.scrollHeight;
    if (contentH > A4_HEIGHT_PX) {
      const scale = A4_HEIGHT_PX / contentH;
      if (scale >= 0.7) {
        el.style.transform = `scale(${scale})`;
        el.style.transformOrigin = "top left";
        el.style.width = `${(1 / scale) * 100}%`;
      }
    }
  }, [invoice]);

  const dispatch = invoice.dispatch_meta || {};
  const buyer = invoice.buyer || { name: "—" };
  const lines = invoice.line_items || [];
  const taxableValue = Number(invoice.subtotal || 0);
  const freightPacking = Number(dispatch.freight_packing || 0);
  const otherCharges = Number(dispatch.other_charges || 0);

  const gstRate = lines[0]?.gst_rate ?? 18;
  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;

  // State fallback: use buyer.state first, then place_of_supply
  const buyerState = buyer.state || dispatch.place_of_supply || "-";
  const buyerStateCode = buyer.state_code || "-";

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        width: "210mm",
        margin: "0 auto",
        padding: "12mm 10mm 10mm 10mm",
        boxSizing: "border-box",
        background: "white",
        color: "black",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr 150px",
          gap: "10px",
          alignItems: "start",
        }}
      >
        <div style={{ border: "1px solid #000", padding: "8px 10px", minHeight: "78px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
            GST Invoice No. {invoice.invoice_number}
          </div>
          <div style={{ marginBottom: "4px" }}>
            <strong>Date</strong> {formatDate(invoice.invoice_date)}
          </div>
          <div>
            <strong>P.O. No.</strong> {invoice.buyers_po_number || "-"}
          </div>
        </div>

        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "20px", letterSpacing: "0.3px" }}>
            VITON ENGINEERS PVT. LTD.
          </div>
          <div style={{ marginTop: "4px", lineHeight: 1.35, fontSize: "10px" }}>
            Office 701, Swastik Disa Corporate Park, Opp. Shreyas Cinema, LBS Marg,
            Ghatkopar W Mumbai- 400086
          </div>
          <div style={{ lineHeight: 1.35, fontSize: "10px" }}>
            Factory B 401, Addl. Ambernath MIDC, Anand Nagar, Ambernath E Dist.
            Thane-421506
          </div>
          <div style={{ marginTop: "3px", fontSize: "10px" }}>
            Phone 08779301215, Tel Fax 022-25660534, Email info@vitonvalves.com
          </div>
          <div style={{ marginTop: "6px", fontWeight: 700, fontSize: "13px" }}>
            GOODS AND SERVICE TAX - INVOICE
          </div>
          <div style={{ fontSize: "10px" }}>Rules 7 Section 31 of GST</div>
        </div>

        <div style={{ minHeight: "78px" }} />
      </div>

      {/* ── Copy labels ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          marginTop: "8px",
          borderTop: "1px solid #000",
          borderBottom: "1px solid #000",
          padding: "4px 0",
          fontSize: "10px",
        }}
      >
        <div>ORIGINAL FOR RECEIPIENT</div>
        <div style={{ textAlign: "center" }}>DUPLICATE FOR TRANSPORTER</div>
        <div style={{ textAlign: "right" }}>TRIPLICATE FOR SUPPLIER</div>
      </div>

      {/* ── Challan / HSN meta ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderLeft: "1px solid #000",
          borderRight: "1px solid #000",
        }}
      >
        <div style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px" }}>
          <div><strong>GST Challan No.</strong> {invoice.invoice_number}</div>
          <div><strong>Date</strong> {formatDate(invoice.invoice_date)}</div>
          <div><strong>P.O. Date</strong> {formatDate(dispatch.po_date)}</div>
          <div><strong>GSTIN No.</strong> 27AACCV7755N1ZK</div>
          <div><strong>PAN No.</strong> AACCV7755N</div>
          <div><strong>Vehicle No.</strong> {dispatch.vehicle_no || "-"}</div>
        </div>
        <div style={{ borderBottom: "1px solid #000", padding: "8px" }}>
          <div><strong>HSN CODE</strong> {lines[0]?.hsn_code || "84818030"}</div>
          <div><strong>UDYAM REGISTRATION NO.</strong> UDYAM-MH-18-0012579</div>
          <div><strong>Date Time of Supply</strong> {dispatch.date_time_of_supply || "-"}</div>
          <div><strong>State</strong> Maharashtra</div>
          <div><strong>Code</strong> 27</div>
          <div><strong>CIN NO.</strong> U29268MH2008PTC184004</div>
        </div>
      </div>

      {/* ── Billed / Shipped ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderLeft: "1px solid #000",
          borderRight: "1px solid #000",
          borderBottom: "1px solid #000",
        }}
      >
        <div style={{ borderRight: "1px solid #000", padding: "8px" }}>
          <div style={{ fontWeight: 700, marginBottom: "6px" }}>
            Name Address Of Receipent Billed to
          </div>
          <div style={{ fontWeight: 700 }}>
            {buyer.company_name || buyer.display_name || buyer.name || "—"}
          </div>
          {dispatch.billed_to ? (
            <div style={{ whiteSpace: "pre-wrap", marginTop: "4px", lineHeight: 1.4 }}>
              {dispatch.billed_to}
            </div>
          ) : null}
          <div style={{ marginTop: "6px" }}>
            <strong>GSTIN</strong> {buyer.gstin || "-"}
          </div>
          <div>
            <strong>State</strong> {buyerState}{" "}
            <strong style={{ marginLeft: 10 }}>Code</strong> {buyerStateCode}
          </div>
          <div style={{ marginTop: "6px" }}>
            <strong>PLACE OF SUPPLY</strong> {dispatch.place_of_supply || buyer.state || "-"}
          </div>
        </div>

        <div style={{ padding: "8px" }}>
          <div style={{ fontWeight: 700, marginBottom: "6px" }}>
            Name Address of Consignee Shipped to
          </div>
          <div style={{ fontWeight: 700 }}>
            {buyer.company_name || buyer.display_name || buyer.name || "—"}
          </div>
          {dispatch.shipped_to ? (
            <div style={{ whiteSpace: "pre-wrap", marginTop: "4px", lineHeight: 1.4 }}>
              {dispatch.shipped_to}
            </div>
          ) : null}
          <div style={{ marginTop: "6px" }}>
            <strong>GSTIN</strong> {buyer.gstin || "-"}
          </div>
          <div>
            <strong>State</strong> {buyerState}{" "}
            <strong style={{ marginLeft: 10 }}>Code</strong> {buyerStateCode}
          </div>
          <div style={{ marginTop: "6px" }}>
            <strong>PLACE OF SUPPLY</strong> {dispatch.place_of_supply || buyer.state || "-"}
          </div>
        </div>
      </div>

      {/* ── Line items ── */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          borderLeft: "1px solid #000",
          borderRight: "1px solid #000",
        }}
      >
        <thead>
          <tr>
            {[
              "Sr. No.",
              "Description of Goods",
              "HSN CODE",
              "GST",
              "No Of Packages",
              "Quantity",
              "UoM",
              "Unit Rate Rs.",
              "Taxable Value Rs.",
            ].map((header) => (
              <th
                key={header}
                style={{
                  borderBottom: "1px solid #000",
                  borderTop: "1px solid #000",
                  borderRight: "1px solid #000",
                  padding: "6px 5px",
                  textAlign: "center",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <td style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "6px 5px", verticalAlign: "top", textAlign: "center", width: "38px" }}>
                {index + 1}
              </td>
              <td style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "6px 7px", verticalAlign: "top", width: "44%" }}>
                {line.buyer_po_sr_no ? (
                  <div style={{ marginBottom: "2px" }}>PO. SR. NO. {line.buyer_po_sr_no}</div>
                ) : null}
                <div style={{ fontWeight: 700, whiteSpace: "pre-wrap", lineHeight: 1.35 }}>
                  {line.description}
                </div>
                {line.buyer_item_code ? (
                  <div style={{ marginTop: "3px", fontSize: "10px" }}>
                    Buyer Item Code: {line.buyer_item_code}
                  </div>
                ) : null}
              </td>
              <td style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "6px 5px", verticalAlign: "top", textAlign: "center" }}>
                {line.hsn_code || "84818030"}
              </td>
              <td style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "6px 5px", verticalAlign: "top", textAlign: "center" }}>
                {Number(line.gst_rate || 0)}
              </td>
              <td style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "6px 5px", verticalAlign: "top", textAlign: "center" }}>
                1
              </td>
              <td style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "6px 5px", verticalAlign: "top", textAlign: "center" }}>
                {line.quantity}
              </td>
              <td style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "6px 5px", verticalAlign: "top", textAlign: "center" }}>
                {line.unit}
              </td>
              <td style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "6px 5px", verticalAlign: "top", textAlign: "right" }}>
                {formatMoney(line.unit_rate)}
              </td>
              <td style={{ borderBottom: "1px solid #000", padding: "6px 5px", verticalAlign: "top", textAlign: "right" }}>
                {formatMoney(line.taxable_value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals / dispatch summary ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          borderLeft: "1px solid #000",
          borderRight: "1px solid #000",
          borderBottom: "1px solid #000",
        }}
      >
        <div style={{ borderRight: "1px solid #000", padding: "8px" }}>
          <div style={{ marginBottom: "6px" }}>
            Tax is payable On Reverse Charges{" "}
            <span style={{ marginLeft: "12px" }}>Yes</span>{" "}
            <span style={{ marginLeft: "12px" }}>No</span>
          </div>
          <div>
            <strong>Invoice Value In Words</strong> {amountToWords(invoice.total)}
          </div>
          {invoice.notes ? (
            <div style={{ marginTop: "8px", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
              <strong>Notes:</strong> {invoice.notes}
            </div>
          ) : null}
        </div>

        <div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <tbody>
              {[
                { label: "TOTAL VALUE",                         value: formatMoney(taxableValue) },
                { label: "Documents Through",                   value: dispatch.documents_through || "-" },
                { label: "Freight Packing",                     value: formatMoney(freightPacking) },
                { label: "Transportation",                      value: dispatch.transportation || "-" },
                { label: "Other Charges",                       value: formatMoney(otherCharges) },
                { label: "L. R. No.",                           value: dispatch.lr_no || "-" },
                { label: "Mode of despatch",                    value: dispatch.mode_of_dispatch || "-" },
                { label: `Central Tax CGST (${cgstRate}%)`,    value: invoice.cgst > 0 ? formatMoney(invoice.cgst) : "0.00" },
                { label: `State Tax SGST (${sgstRate}%)`,      value: invoice.sgst > 0 ? formatMoney(invoice.sgst) : "0.00" },
                { label: `Integrated Tax IGST (${gstRate}%)`,  value: invoice.igst > 0 ? formatMoney(invoice.igst) : "0.00" },
              ].map(({ label, value }) => (
                <tr key={label}>
                  <td style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "6px 8px" }}>
                    {label}
                  </td>
                  <td style={{ borderBottom: "1px solid #000", textAlign: "right", padding: "6px 8px" }}>
                    {value}
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ borderRight: "1px solid #000", padding: "8px", fontWeight: 700 }}>
                  TOTAL INVOICE VALUE
                </td>
                <td style={{ textAlign: "right", padding: "8px", fontWeight: 700 }}>
                  {formatMoney(invoice.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Disclaimer + Signature — never split across pages ── */}
      <div style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
        <div
          style={{
            borderLeft: "1px solid #000",
            borderRight: "1px solid #000",
            borderBottom: "1px solid #000",
            padding: "8px 10px",
            fontSize: "10px",
            lineHeight: 1.35,
          }}
        >
          I/We hereby certify that my/our registration certificate under the GST Act 2017
          is in force on the date on which the sale of the goods specified in this GST
          invoice is made by me/us and that the transaction of sale covered by this GST
          invoice has been effected by me/us and it shall be accounted for in the turnover
          of sales while filing of return and due tax, if any payable on this sale has
          been paid or shall be paid.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px",
            borderLeft: "1px solid #000",
            borderRight: "1px solid #000",
            borderBottom: "1px solid #000",
          }}
        >
          <div
            style={{
              padding: "12px 10px",
              fontSize: "10px",
              display: "flex",
              alignItems: "end",
            }}
          >
            SUBJECT TO MUMBAI JURISDICTION
          </div>
          <div
            style={{
              borderLeft: "1px solid #000",
              padding: "12px 10px",
              minHeight: "92px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ textAlign: "center", fontWeight: 700 }}>
              For VITON ENGINEERS PVT. LTD.
            </div>
            <div style={{ textAlign: "center", marginTop: "36px" }}>
              {invoice.signed_by || "Authorised Signatory"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
