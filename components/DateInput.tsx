"use client";

import React, { useEffect, useState } from "react";

function isoToDDMMYY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}.${m}.${y.slice(-2)}`;
}

function ddmmyyToISO(ddmmyy: string): string {
  if (!ddmmyy) return "";
  const parts = ddmmyy.split(/[.\/\-]/);
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  if (!d || !m || !y) return "";
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function DateInput({
  value,
  onChange,
  label,
  required,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}) {
  const [draftIso, setDraftIso] = useState(ddmmyyToISO(value));

  useEffect(() => {
    setDraftIso(ddmmyyToISO(value));
  }, [value]);

  return (
    <div className={className}>
      {label && (
        <label className="block text-[10px] font-semibold text-[#4a5578] dark:text-gray-400 mb-1.5 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        type="date"
        value={draftIso}
        onChange={(e) => {
          const raw = e.target.value;
          setDraftIso(raw);
          if (raw) onChange(isoToDDMMYY(raw));
          else onChange("");
        }}
        className="w-full bg-[#f6f8fc] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-viton-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-viton-red/20 dark:focus:ring-orange-500/20 focus:border-viton-red dark:focus:border-orange-500 transition-all"
      />
      {value && (
        <p className="text-[10px] text-[#8892a8] dark:text-gray-500 mt-0.5">Stored as: {value}</p>
      )}
    </div>
  );
}
