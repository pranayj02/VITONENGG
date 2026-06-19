"use client";

import React, { useRef } from "react";
import { Calendar } from "lucide-react";

function isoToDDMMYY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const yy = y.slice(-2);
  return `${d}.${m}.${yy}`;
}

function ddmmyyToISO(ddmmyy: string): string {
  if (!ddmmyy) return "";
  const parts = ddmmyy.split(/[.\/\-]/);
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  const year = y.length === 2 ? `20${y}` : y;
  const mm = m.padStart(2, "0");
  const dd = d.padStart(2, "0");
  return `${year}-${mm}-${dd}`;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const isoValue = ddmmyyToISO(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(isoToDDMMYY(e.target.value));
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-[10px] font-semibold text-[#4a5578] dark:text-gray-400 mb-1.5 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          value={isoValue}
          onChange={handleChange}
          className="w-full bg-[#f6f8fc] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-viton-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-viton-red/20 dark:focus:ring-orange-500/20 focus:border-viton-red dark:focus:border-orange-500 transition-all"
        />
      </div>
      {value && (
        <p className="text-[10px] text-[#8892a8] dark:text-gray-500 mt-0.5">{value}</p>
      )}
    </div>
  );
}
