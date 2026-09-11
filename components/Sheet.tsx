"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        {children}
      </div>
    </div>,
    document.body
  );
}
