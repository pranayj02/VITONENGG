"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const WEEK_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function parseStoredDate(value: string): Date | null {
  if (!value) return null;
  const parts = value.split(/[./-]/);
  if (parts.length !== 3) return null;
  const [dRaw, mRaw, yRaw] = parts;
  const d = Number(dRaw);
  const m = Number(mRaw);
  const y = Number(yRaw.length === 2 ? `20${yRaw}` : yRaw);
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function formatStoredDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = String(date.getFullYear()).slice(-2);
  return `${d}.${m}.${y}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCalendarDays(viewMonth: Date): Date[] {
  const first = startOfMonth(viewMonth);
  const mondayIndex = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayIndex);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
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
  const [open, setOpen] = useState(false);
  const [textValue, setTextValue] = useState(value || "");
  const selectedDate = useMemo(() => parseStoredDate(textValue) ?? parseStoredDate(value), [textValue, value]);
  const [viewMonth, setViewMonth] = useState<Date>(selectedDate ?? new Date());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTextValue(value || "");
  }, [value]);

  useEffect(() => {
    if (selectedDate) setViewMonth(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const days = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);
  const today = new Date();

  const commitTextValue = (next: string) => {
    setTextValue(next);
    if (next.length === 0) {
      onChange("");
      return;
    }
    const parsed = parseStoredDate(next);
    if (parsed) onChange(formatStoredDate(parsed));
  };

  return (
    <div className={`relative ${className ?? ""}`} ref={wrapRef}>
      {label && (
        <label className="block text-[10px] font-semibold text-[#4a5578] dark:text-gray-400 mb-1.5 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={textValue}
          placeholder="DD.MM.YY"
          onChange={(e) => {
            const masked = maskDateInput(e.target.value);
            setTextValue(masked);
            if (masked.length === 0) onChange("");
            if (masked.length === 8) {
              const parsed = parseStoredDate(masked);
              if (parsed) onChange(formatStoredDate(parsed));
            }
          }}
          onBlur={() => commitTextValue(textValue)}
          className="w-full h-[42px] bg-[#f6f8fc] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 pr-11 text-sm text-viton-navy dark:text-white placeholder:text-[#8892a8] dark:placeholder:text-gray-500 hover:border-viton-red/40 dark:hover:border-orange-500/40 focus:outline-none focus:ring-2 focus:ring-viton-red/20 dark:focus:ring-orange-500/20 focus:border-viton-red dark:focus:border-orange-500 transition-all"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg border border-transparent text-[#8892a8] dark:text-gray-500 hover:bg-[#eef2f8] dark:hover:bg-gray-900 hover:text-viton-red dark:hover:text-orange-400 transition-all flex items-center justify-center"
        >
          <CalendarDays size={16} />
        </button>
      </div>

      <p className="text-[10px] text-[#8892a8] dark:text-gray-500 mt-0.5">Format: DD.MM.YY</p>

      {open && (
        <div className="absolute z-50 mt-2 w-[290px] rounded-2xl border border-[#dde1ea] dark:border-gray-700 bg-white/96 dark:bg-[#0f1724]/96 backdrop-blur-md shadow-[0_20px_50px_rgba(15,23,36,0.14)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="px-3 py-3 border-b border-[#eef1f6] dark:border-gray-800 bg-gradient-to-r from-white to-[#f7f9fd] dark:from-[#0f1724] dark:to-[#121b2a]">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="h-8 w-8 rounded-lg border border-[#dde1ea] dark:border-gray-700 bg-white dark:bg-gray-900 text-[#4a5578] dark:text-gray-300 hover:border-viton-red/40 dark:hover:border-orange-500/40 transition-all flex items-center justify-center"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#8892a8] dark:text-gray-500">Choose date</p>
                <p className="text-sm font-semibold text-viton-navy dark:text-white">{monthLabel(viewMonth)}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="h-8 w-8 rounded-lg border border-[#dde1ea] dark:border-gray-700 bg-white dark:bg-gray-900 text-[#4a5578] dark:text-gray-300 hover:border-viton-red/40 dark:hover:border-orange-500/40 transition-all flex items-center justify-center"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="h-8 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-[#8892a8] dark:text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const inMonth = day.getMonth() === viewMonth.getMonth();
                const selected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, today);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      const formatted = formatStoredDate(day);
                      setTextValue(formatted);
                      onChange(formatted);
                      setOpen(false);
                    }}
                    className={[
                      "h-9 rounded-xl text-sm transition-all flex items-center justify-center border",
                      selected
                        ? "bg-viton-red text-white border-viton-red shadow-sm dark:bg-orange-500 dark:border-orange-500"
                        : isToday
                        ? "border-viton-red/40 dark:border-orange-500/50 text-viton-navy dark:text-white bg-viton-red/[0.06] dark:bg-orange-500/[0.10]"
                        : inMonth
                        ? "border-transparent text-viton-navy dark:text-gray-200 hover:bg-[#f3f6fb] dark:hover:bg-gray-900"
                        : "border-transparent text-[#b0b8c8] dark:text-gray-600 hover:bg-[#f3f6fb] dark:hover:bg-gray-900",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-3 py-3 border-t border-[#eef1f6] dark:border-gray-800 bg-[#fbfcff] dark:bg-[#0d1520] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const formatted = formatStoredDate(now);
                setViewMonth(now);
                setTextValue(formatted);
                onChange(formatted);
                setOpen(false);
              }}
              className="text-xs font-semibold text-viton-red dark:text-orange-400 hover:opacity-80 transition-opacity"
            >
              Today
            </button>
            <div className="flex items-center gap-2">
              {textValue && (
                <button
                  type="button"
                  onClick={() => {
                    setTextValue("");
                    onChange("");
                  }}
                  className="h-8 px-2 rounded-lg border border-[#dde1ea] dark:border-gray-700 text-[#6f7891] dark:text-gray-400 hover:border-viton-red/40 dark:hover:border-orange-500/40 text-xs font-medium flex items-center gap-1"
                >
                  <X size={12} /> Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 px-3 rounded-lg bg-viton-navy dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
