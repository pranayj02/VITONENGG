"use client";

import { useEffect } from "react";

export default function AutoPrint() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      window.print();
    }, 300);

    return () => window.clearTimeout(t);
  }, []);

  return null;
}
