"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { getCurrentFY } from "@/lib/fy";
import type { Item, ReqLineItem } from "@/lib/types";
import {
  Search,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  X,
  ArrowLeft,
} from "lucide-react";

interface LineForm extends ReqLineItem {
  tempId: number;
}

export default function NewRequisitionPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [lines, setLines] = useState<LineForm[]>([]);
  const [notes, setNotes] = useState("");
  const [department, setDepartment] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [requiredBy, setRequiredBy] = useState("");
  const [woNumber, setWoNumber] = useState("");
  const [reqNumber, setReqNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data } = await supabase.from("items").select("*").order("serial_id");
      setItems((data ?? []) as unknown as Item[]);

      const fy = getCurrentFY();
      const { data: rows } = await supabase
        .from("requisitions")
        .select("fy_serial")
        .eq("fy_label", fy)
        .order("fy_serial", { ascending: false })
        .limit(1);

      const nextSerial = (Number((rows as any)?.[0]?.fy_serial) || 0) + 1;
      setReqNumber(`MR/${String(nextSerial).padStart(3, "0")}/${fy}`);
    }
    init();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); setShowSearch(false); return; }
    const q = search.toLowerCase();
    const res = items
      .filter((i) => i.serial_id.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
      .slice(0, 8);
    setSearchResults(res);
    setShowSearch(res.length > 0);
  }, [search, items]);

  function addLine(item: Item) {
    setLines((prev) => [
      ...prev,
      {
        tempId: nextId.current++,
        item_id: item.id,
        serial_id: item.serial_id,
        name: item.name,
        unit: item.unit,
        qty_requested: 1,
        custom_note: "",
      },
    ]);
    setSearch("");
    setShowSearch(false);
  }

  function updateLine(tempId: number, patch: Partial<LineForm>) {
    setLines((prev) => prev.map((l) => (l.tempId === tempId ? { ...l, ...patch } : l)));
  }

  function removeLine(tempId: number) {
    setLines((prev) => prev.filter((l) => l.tempId !== tempId));
  }

  async function handleSave() {
    if (lines.length === 0) { setError("Add at least one item."); return; }
    setSaving(true); setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from("profiles").select("full_name, department").eq("id", user.id).single()
      : { data: null };
    const profileData = profile as any;

    const woText = woNumber.trim();
    const notesText = notes.trim();
    const finalNotes = [
      notesText,
      woText ? `WO No.: ${woText}` : "",
    ].filter(Boolean).join("\n");

    const cleanLines = lines.map(({ tempId, ...rest }) => rest);
    const reqRows = cleanLines.map((line, index) => ({
      req_number: cleanLines.length > 1 ? `${reqNumber}-${index + 1}` : reqNumber,
      fy_label: getCurrentFY(),
      fy_serial: Number(reqNumber.split("/")[1]),
      requested_by: user?.id ?? null,
      requested_by_name: profileData?.full_name?.trim() || "Yatish Jain",
      department: department.trim() || profileData?.department || null,
      priority,
      status: "pending",
      line_items: [line],
      notes: finalNotes || null,
      required_by: requiredBy || null,
      po_id: null,
    }));

    const { data: insertedReqs, error: saveErr } = await supabase.from("requisitions").insert(reqRows).select("id, req_number");
    if (saveErr) { setError(saveErr.message); setSaving(false); return; }

    await audit({
      action: "mr_requested",
      entity_type: "requisition",
      entity_code: reqNumber,
      details: {
        department: department.trim() || profileData?.department || null,
        priority,
        required_by: requiredBy || null,
        wo_number: woText || null,
        line_count: cleanLines.length,
        split_into_sub_mrs: cleanLines.length > 1,
        created_req_numbers: (insertedReqs ?? []).map((row: any) => row.req_number),
      },
    });

    setSaved(true);
    setSaving(false);
  }

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500 dark:text-green-400" />
          </div>
          <h2 className="text-viton-navy dark:text-white text-xl font-bold mb-1">Requisition Raised!</h2>
          <p className="text-viton-red dark:text-orange-400 text-sm font-mono mb-2">{reqNumber}</p>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mb-6">
            {lines.length > 1 ? `Created as ${lines.length} sub-MRs, one for each line item.` : "Your manager will be notified for approval."}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="/dashboard/requisitions/new" className="bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
              <Plus size={15} /> Another MR
            </a>
            <a href="/dashboard/requisitions" className="bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold px-5 py-2.5 rounded-xl text-sm">
              View Requisitions
            </a>
          </div>
        </div>
      </div>
    );
  }

  const MIN_ROWS = 8;
  const displayRows = [...lines, ...Array(Math.max(0, MIN_ROWS - lines.length)).fill(null)];
  const fy = getCurrentFY();
  const revDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-4">
        <a href="/dashboard/requisitions" className="text-sm text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white flex items-center gap-1 mb-2">
          <ArrowLeft size={14} /> Back to Requisitions
        </a>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 text-red-600 dark:text-red-300 text-sm mb-6">{error}</div>
      )}

      {/* ── A4 FORM ── */}
      <div
        style={{
          background: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "10pt",
          color: "#000",
          padding: "10mm 12mm",
          boxSizing: "border-box",
          border: "1px solid #ddd",
          borderRadius: "4px",
        }}
      >
        {/* Header */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0" }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "top", width: "55%", paddingRight: "8px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <img
                    src="/Logo.JPG"
                    alt="Viton Engineers"
                    style={{ width: "54px", height: "54px", objectFit: "contain", flexShrink: 0 }}
                    crossOrigin="anonymous"
                  />
                  <div>
                    <div style={{ fontSize: "13pt", fontWeight: "900", letterSpacing: "0.3px", lineHeight: 1.2 }}>
                      VITON ENGINEERS PVT. LTD.
                    </div>
                    <div style={{ fontSize: "7.5pt", color: "#333", marginTop: "3px", lineHeight: 1.5 }}>
                      WORKS: B40/1, ADDL. Ambernath MIDC, Anand Nagar,<br />
                      Opp. Hali Pad, Ambernath East, Dist. Thane - 421506
                    </div>
                    <div style={{ fontSize: "7.5pt", color: "#333", marginTop: "2px" }}>
                      Tel: 08779301215 / 9769639388 | Email: info@vitonvalves.com
                    </div>
                    <div style={{ fontSize: "7.5pt", color: "#333" }}>
                      GSTIN: <strong>27AACCV7755N1ZK</strong>
                    </div>
                  </div>
                </div>
              </td>

              <td style={{ verticalAlign: "top", width: "45%" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000" }}>
                  <tbody>
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          background: "#1a1a6e",
                          color: "#fff",
                          textAlign: "center",
                          fontWeight: "900",
                          fontSize: "11pt",
                          letterSpacing: "1.5px",
                          padding: "5px 8px",
                          textTransform: "uppercase",
                        }}
                      >
                        Requisition Slip
                      </td>
                    </tr>
                    <tr style={{ borderTop: "1px solid #000" }}>
                      <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000", whiteSpace: "nowrap" }}>
                        Doc No.
                      </td>
                      <td style={{ padding: "3px 6px", fontSize: "7.5pt", borderRight: "1px solid #000" }}>
                        VT-PPC-R-04
                      </td>
                      <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000", whiteSpace: "nowrap" }}>
                        Rev No.
                      </td>
                      <td style={{ padding: "3px 6px", fontSize: "7.5pt" }}>00</td>
                    </tr>
                    <tr style={{ borderTop: "1px solid #000" }}>
                      <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000", whiteSpace: "nowrap" }}>
                        Rev Date
                      </td>
                      <td style={{ padding: "3px 6px", fontSize: "7.5pt", borderRight: "1px solid #000" }}>
                        {revDate}
                      </td>
                      <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000", whiteSpace: "nowrap" }}>
                        Req No.
                      </td>
                      <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700" }}>
                        {reqNumber}
                      </td>
                    </tr>
                    <tr style={{ borderTop: "1px solid #000" }}>
                      <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000" }}>
                        Date
                      </td>
                      <td colSpan={3} style={{ padding: "3px 6px", fontSize: "7.5pt" }}>
                        {date}
                      </td>
                    </tr>
                    <tr style={{ borderTop: "1px solid #000" }}>
                      <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000" }}>
                        Priority
                      </td>
                      <td colSpan={3} style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700" }}>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as any)}
                          style={{ fontSize: "7.5pt", fontWeight: "700", border: "none", background: "transparent", color: priority === "urgent" ? "#cc0000" : priority === "high" ? "#cc6600" : "#000", cursor: "pointer" }}
                        >
                          <option value="low">LOW</option>
                          <option value="normal">NORMAL</option>
                          <option value="high">HIGH</option>
                          <option value="urgent">URGENT</option>
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Description / WO Row */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "1.5px solid #000", marginTop: "6px" }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #000", padding: "4px 8px", width: "15%", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>
                Description
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 8px", width: "55%" }}>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter description / purpose of requisition"
                  style={{ width: "100%", fontSize: "8.5pt", border: "none", background: "transparent", outline: "none" }}
                />
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 8px", width: "12%", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>
                WO No.
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 8px", width: "18%" }}>
                <input
                  value={woNumber}
                  onChange={(e) => setWoNumber(e.target.value)}
                  placeholder="Optional"
                  style={{ width: "100%", fontSize: "8.5pt", border: "none", background: "transparent", outline: "none" }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>
                Dept.
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 8px" }}>
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Production"
                  style={{ width: "100%", fontSize: "8.5pt", border: "none", background: "transparent", outline: "none" }}
                />
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>
                Req. By
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 8px", fontSize: "8.5pt", color: "#444" }}>
                {/* Auto-filled from auth on save */}
                <input
                  value={""}
                  placeholder="Auto-filled from profile"
                  readOnly
                  style={{ width: "100%", fontSize: "8.5pt", border: "none", background: "transparent", outline: "none", color: "#888" }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>
                Required By
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 8px" }}>
                <input
                  type="date"
                  value={requiredBy}
                  onChange={(e) => setRequiredBy(e.target.value)}
                  style={{ width: "100%", fontSize: "8.5pt", border: "none", background: "transparent", outline: "none" }}
                />
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>
                FY
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 8px", fontSize: "8.5pt", color: "#444" }}>
                {fy}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Item Search */}
        <div style={{ marginTop: "10px", marginBottom: "6px" }}>
          <div className="relative" ref={searchRef}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8892a8]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search catalog by serial ID or name..."
              style={{
                width: "100%", padding: "6px 10px 6px 32px", fontSize: "9pt",
                border: "1px solid #ccc", borderRadius: "4px", background: "#fafafa",
              }}
            />
            {showSearch && searchResults.length > 0 && (
              <div className="absolute z-50 mt-1 bg-white border border-[#dde1ea] rounded-lg shadow-lg overflow-hidden w-full">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addLine(item)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#f1f3f8] text-left border-b border-[#eef1f6] last:border-0"
                  >
                    <div>
                      <p className="text-viton-red font-mono text-[10px] font-semibold">{item.serial_id}</p>
                      <p className="text-gray-800 text-[11px]">{item.name}</p>
                    </div>
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.unit}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a1a6e", color: "#fff" }}>
              {[
                { label: "Sr No.", w: "5%", align: "center" as const },
                { label: "Item / Description", w: "40%", align: "left" as const },
                { label: "Serial ID", w: "18%", align: "center" as const },
                { label: "Valve Size / Unit", w: "16%", align: "center" as const },
                { label: "Quantity", w: "10%", align: "center" as const },
                { label: "Remarks", w: "11%", align: "left" as const },
              ].map((col) => (
                <th
                  key={col.label}
                  style={{
                    border: "1px solid #000",
                    padding: "5px 6px",
                    fontWeight: "700",
                    fontSize: "8.5pt",
                    textAlign: col.align,
                    width: col.w,
                    letterSpacing: "0.3px",
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((line, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "center", fontSize: "8.5pt", color: "#666" }}>
                  {line ? i + 1 : ""}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "4px 6px" }}>
                  {line ? (
                    <input
                      value={line.name}
                      onChange={(e) => updateLine(line.tempId, { name: e.target.value })}
                      style={{ width: "100%", fontSize: "8.5pt", border: "none", background: "transparent", outline: "none" }}
                    />
                  ) : (
                    <span style={{ color: "#ddd" }}>—</span>
                  )}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "center", fontSize: "8pt", fontFamily: "monospace", color: "#1a1a6e" }}>
                  {line ? (
                    <input
                      value={line.serial_id}
                      onChange={(e) => updateLine(line.tempId, { serial_id: e.target.value })}
                      style={{ width: "100%", fontSize: "8pt", border: "none", background: "transparent", outline: "none", textAlign: "center", fontFamily: "monospace" }}
                    />
                  ) : (
                    <span style={{ color: "#ddd" }}>—</span>
                  )}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "center", fontSize: "8.5pt" }}>
                  {line ? (
                    <input
                      value={line.unit}
                      onChange={(e) => updateLine(line.tempId, { unit: e.target.value })}
                      style={{ width: "100%", fontSize: "8.5pt", border: "none", background: "transparent", outline: "none", textAlign: "center" }}
                    />
                  ) : (
                    <span style={{ color: "#ddd" }}>—</span>
                  )}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "center", fontSize: "8.5pt" }}>
                  {line ? (
                    <input
                      type="number"
                      min={1}
                      value={line.qty_requested}
                      onChange={(e) => updateLine(line.tempId, { qty_requested: Number(e.target.value) })}
                      style={{ width: "100%", fontSize: "8.5pt", border: "none", background: "transparent", outline: "none", textAlign: "center" }}
                    />
                  ) : (
                    <span style={{ color: "#ddd" }}>—</span>
                  )}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "4px 6px", fontSize: "8pt" }}>
                  {line ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={line.custom_note ?? ""}
                        onChange={(e) => updateLine(line.tempId, { custom_note: e.target.value })}
                        style={{ width: "100%", fontSize: "8pt", border: "none", background: "transparent", outline: "none" }}
                      />
                      <button onClick={() => removeLine(line.tempId)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: "#ddd" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer / Actions */}
        <div style={{ marginTop: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "8pt", color: "#888" }}>
            This is a computer generated Requisition Slip.
          </div>
          <div className="flex items-center gap-3">
            <a href="/dashboard/requisitions" className="bg-[#f1f3f8] hover:bg-[#e8eaf2] text-[#4a5578] font-semibold px-4 py-2 rounded-lg text-sm">
              Cancel
            </a>
            <button
              onClick={handleSave}
              disabled={saving || lines.length === 0}
              className="bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm flex items-center gap-2"
            >
              <Save size={14} /> {saving ? "Saving..." : "Submit Requisition"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
