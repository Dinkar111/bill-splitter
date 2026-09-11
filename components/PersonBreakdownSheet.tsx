"use client";

import { Sheet } from "@/components/Sheet";
import type { PersonResult } from "@/lib/calc";
import { currencySymbol, money } from "@/lib/format";

export function PersonBreakdownSheet({ name, currency, result, onClose }: { name: string; currency: string; result: PersonResult; onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <h3>{name}</h3>
      <p className="sh-sub">Exactly how this person&apos;s share is built up.</p>
      <div className="receipt">
        {result.itemLines.length ? (
          result.itemLines.map((l, i) => (
            <div className="rr" key={i}>
              <span>{l.name}</span>
              <span>{money(l.amount)}</span>
            </div>
          ))
        ) : (
          <div className="rr">
            <span className="muted">No items</span>
            <span>0</span>
          </div>
        )}
        <div className="rr rule">
          <span>Item subtotal</span>
          <span>{money(result.itemSubtotal)}</span>
        </div>
        {result.discount > 0 && (
          <div className="rr">
            <span>Discount</span>
            <span className="neg">− {money(result.discount)}</span>
          </div>
        )}
        {result.charges
          .filter((c) => c.amount)
          .map((c, i) => (
            <div className="rr" key={i}>
              <span>{c.name}</span>
              <span>+ {money(c.amount)}</span>
            </div>
          ))}
        <div className="rr rule big">
          <span>Final share</span>
          <span>
            {currencySymbol(currency)} {money(result.final)}
          </span>
        </div>
        <div className="rr">
          <span>Paid</span>
          <span>{money(result.paid)}</span>
        </div>
        <div className="rr big">
          <span>{result.balance >= 0 ? "To receive" : "To pay"}</span>
          <span className={result.balance >= 0 ? "pos" : "neg"}>
            {currencySymbol(currency)} {money(Math.abs(result.balance))}
          </span>
        </div>
      </div>
      <button className="btn primary block" style={{ marginTop: 14 }} onClick={onClose}>
        Close
      </button>
    </Sheet>
  );
}
