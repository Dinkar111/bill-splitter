"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { CHARGE_LABEL, type ChargeBasis, type ChargeKind, type ChargeMode, type ExpenseCharge } from "@/lib/calc";

const KINDS: ChargeKind[] = ["vat", "service", "tip", "other"];

export function ChargeSheet({
  charge,
  onClose,
  onSave,
  onDelete,
}: {
  charge: ExpenseCharge | null;
  onClose: () => void;
  onSave: (c: ExpenseCharge) => void;
  onDelete: () => void;
}) {
  const editing = !!charge;
  const [name, setName] = useState(charge?.name || "");
  const [kind, setKind] = useState<ChargeKind>(charge?.kind || "other");
  const [mode, setMode] = useState<ChargeMode>(charge?.mode || "percent");
  const [value, setValue] = useState(charge?.value || 0);
  const [basis, setBasis] = useState<ChargeBasis>(charge?.basis || "after");

  function pickKind(k: ChargeKind) {
    setKind(k);
    if (!name) setName(CHARGE_LABEL[k]);
  }

  function save() {
    onSave({ id: charge?.id || crypto.randomUUID(), name: name.trim() || CHARGE_LABEL[kind], kind, mode, value, basis });
  }

  return (
    <Sheet onClose={onClose}>
      <h3>{editing ? "Edit charge" : "Add charge"}</h3>
      <label className="field">
        <span className="lb">Name</span>
        <input type="text" autoComplete="off" placeholder="VAT / Service charge / Tip" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="field">
        <span className="lb">Type</span>
        <div className="seg">
          {KINDS.map((k) => (
            <button key={k} type="button" className={kind === k ? "on" : ""} onClick={() => pickKind(k)}>
              {CHARGE_LABEL[k]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="lb">Amount</span>
        <div className="seg" style={{ marginBottom: 8 }}>
          <button type="button" className={mode === "percent" ? "on" : ""} onClick={() => setMode("percent")}>
            Percent
          </button>
          <button type="button" className={mode === "fixed" ? "on" : ""} onClick={() => setMode("fixed")}>
            Fixed
          </button>
        </div>
        <input type="number" className="mono" inputMode="decimal" min={0} step="any" value={value || ""} onChange={(e) => setValue(parseFloat(e.target.value) || 0)} />
      </div>
      <div className="field">
        <span className="lb">Calculated on</span>
        <div className="seg">
          <button type="button" className={basis === "before" ? "on" : ""} onClick={() => setBasis("before")}>
            Before discount
          </button>
          <button type="button" className={basis === "after" ? "on" : ""} onClick={() => setBasis("after")}>
            After discount
          </button>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          Restaurants differ — check your bill which subtotal VAT/service is a % of.
        </p>
      </div>
      <button className="btn primary block" onClick={save}>
        {editing ? "Save" : "Add charge"}
      </button>
      {editing && (
        <button className="btn danger block" style={{ marginTop: 8 }} onClick={onDelete}>
          Delete charge
        </button>
      )}
    </Sheet>
  );
}
