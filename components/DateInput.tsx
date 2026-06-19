"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calendar } from "lucide-react";

function parseDDMMYY(str: string): Date | null {
  if (!str) return null;
  const parts = str.split(/[.\/\-]/);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  const year = y < 100 ? 2000 + y : y;
  const date = new Date(year, m - 1, d);
  if (date.getDate() !== d || date.getMonth() !== m - 1 || date.getFullYear() !== year) return null;
  return date;
}

function formatDateDDMMYY(date: Date | null): string {
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = String(date.getFullYear()).slice(-2);
  return `${d}.${m}.${y}`;
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DateInput({
  value,
  onChange,
  placeholder = "DD.MM.YY",
  label,
  required,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isValid, setIsValid] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInputChange = (val: string) => {
    // Only allow digits, dots, and slashes
    const cleaned = val.replace(/[^0-9./\-]/g, "");
    setInputValue(cleaned);

    if (!cleaned) {
      setIsValid(true);
      onChange("");
      return;
    }

    const date = parseDDMMYY(cleaned);
    if (date) {
      setIsValid(true);
      onChange(formatDateDDMMYY(date));
    } else {
      setIsValid(false);
      // Still allow partial input but don't update parent
    }
  };

  const handleBlur = () => {
    if (!inputValue) {
      setIsValid(true);
      onChange("");
      return;
    }
    const date = parseDDMMYY(inputValue);
    if (date) {
      setIsValid(true);
      setInputValue(formatDateDDMMYY(date));
      onChange(formatDateDDMMYY(date));
    } else {
      setIsValid(false);
    }
  };

  const handleDatePicker = (isoDate: string) => {
    if (!isoDate) {
      setInputValue("");
      onChange("");
      setIsValid(true);
      setOpen(false);
      return;
    }
    const [y, m, d] = isoDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const formatted = formatDateDDMMYY(date);
    setInputValue(formatted);
    onChange(formatted);
    setIsValid(true);
    setOpen(false);
  };

  const currentDate = parseDDMMYY(inputValue);
  const isoValue = currentDate ? formatDateISO(currentDate) : "";

  return (
    <div className={`relative ${className || ""}`} ref={pickerRef}>
      {label && (
        <label className="block text-[10px] font-semibold text-[#4a5578] dark:text-gray-400 mb-1.5 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full bg-[#f6f8fc] dark:bg-gray-950 border rounded-lg px-3 py-2 text-sm text-viton-navy dark:text-white placeholder:text-[#8892a8] dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 transition-all pr-10 ${
            isValid
              ? "border-[#dde1ea] dark:border-gray-700 focus:ring-viton-red/20 dark:focus:ring-orange-500/20 focus:border-viton-red dark:focus:border-orange-500"
              : "border-red-300 dark:border-red-500/40 focus:border-red-500 focus:ring-red-200"
          }`}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[#e7ebf3] dark:hover:bg-gray-800 text-[#8892a8] dark:text-gray-500 transition-colors"
        >
          <Calendar size={14} />
        </button>
      </div>
      {!isValid && inputValue && (
        <p className="text-[10px] text-red-500 mt-0.5 font-medium">Invalid date format. Use DD.MM.YY</p>
      )}
      {isValid && (
        <p className="text-[10px] text-[#8892a8] dark:text-gray-500 mt-0.5">Format: DD.MM.YY</p>
      )}

      {open && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-700 rounded-xl shadow-xl p-3">
          <input
            type="date"
            value={isoValue}
            onChange={(e) => handleDatePicker(e.target.value)}
            className="bg-[#f6f8fc] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-viton-navy dark:text-white"
          />
        </div>
      )}
    </div>
  );
}
