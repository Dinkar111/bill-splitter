"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { Avatar } from "@/components/Avatar";
import type { ExpensePayment } from "@/lib/calc";
import { currencySymbol, money } from "@/lib/format";
import type { GroupMember } from "@/lib/types";

export function PaymentSheet({
  payment,
  participants,
  members,
  currency,
  remainingMinor,
  onClose,
  onSave,
  onDelete,
}: {
  payment: ExpensePayment | null;
  participants: string[];
  members: GroupMember[];
  currency: string;
  remainingMinor: number;
  onClose: () => void;
  onSave: (p: ExpensePayment) => void;
  onDelete: () => void;
}) {
  const editing = !!payment;
  const [personId, setPersonId] = useState<string | null>(payment?.personId || participants[0] || null);
  const [amount, setAmount] = useState(payment?.amount || 0);

  const roster = participants.map((id) => members.find((m) => m.id === id)).filter((m): m is GroupMember => !!m);

  function save() {
    if (!personId) return;
    onSave({ id: payment?.id || crypto.randomUUID(), personId, amount });
  }

  return (
    <Sheet onClose={onClose}>
      <h3>{editing ? "Edit payment" : "Record payment"}</h3>
      <p className="sh-sub">
        {money(Math.max(0, remainingMinor))} {currencySymbol(currency)} still unrecorded
      </p>
      <div className="lb" style={{ marginBottom: 8 }}>
        Paid by
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {roster.map((p) => (
          <button key={p.id} type="button" className={`chip ${personId === p.id ? "on" : ""}`} onClick={() => setPersonId(p.id)}>
            <Avatar id={p.id} name={p.display_name} size="sm" /> {p.display_name.split(" ")[0]}
          </button>
        ))}
      </div>
      <label className="field">
        <span className="lb">Amount</span>
        <input type="number" className="mono" inputMode="decimal" min={0} step="any" value={amount || ""} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
      </label>
      <button className="btn ghost sm" style={{ marginBottom: 12 }} onClick={() => setAmount(Math.max(0, remainingMinor) / 100)}>
        Paid the rest ({currencySymbol(currency)} {money(Math.max(0, remainingMinor))})
      </button>
      <button className="btn primary block" onClick={save}>
        {editing ? "Save" : "Add payment"}
      </button>
      {editing && (
        <button className="btn danger block" style={{ marginTop: 8 }} onClick={onDelete}>
          Remove
        </button>
      )}
    </Sheet>
  );
}
