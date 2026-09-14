"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Spinner } from "@/components/Spinner";
import { ItemSheet } from "./ItemSheet";
import { ChargeSheet } from "./ChargeSheet";
import { PaymentSheet } from "./PaymentSheet";
import { emptyDraft, type ExpenseDraft } from "./types";
import { CHARGE_LABEL, computeExpense, toMinor, type ExpenseCharge, type ExpenseItem, type ExpensePayment } from "@/lib/calc";
import { currencySymbol, money } from "@/lib/format";
import { addUnclaimedMember, saveExpense, uploadReceipt } from "@/lib/actions";
import type { Expense, GroupMember } from "@/lib/types";

const CURRENCIES = ["NPR", "INR", "USD", "EUR", "GBP", "AUD", "JPY"];

type SheetState =
  | { type: "item"; item: ExpenseItem | null }
  | { type: "charge"; charge: ExpenseCharge | null }
  | { type: "payment"; payment: ExpensePayment | null }
  | { type: "addMember" }
  | null;

export function ExpenseEditor({
  groupId,
  defaultCurrency,
  members,
  existing,
  onClose,
}: {
  groupId: string;
  defaultCurrency: string;
  members: GroupMember[];
  existing?: Expense | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ExpenseDraft>(() =>
    existing
      ? {
          id: existing.id,
          title: existing.title,
          date: existing.date,
          location: existing.location || "",
          currency: existing.currency,
          notes: existing.notes || "",
          receiptPath: existing.receipt_url,
          data: existing.data,
        }
      : emptyDraft(defaultCurrency, new Date().toISOString().slice(0, 10))
  );
  const [sheet, setSheet] = useState<SheetState>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => computeExpense(draft), [draft]);
  const t = result.totals;

  function updateData(patch: Partial<ExpenseDraft["data"]>) {
    setDraft((d) => ({ ...d, data: { ...d.data, ...patch } }));
  }

  function toggleParticipant(id: string) {
    setDraft((d) => {
      const has = d.data.participants.includes(id);
      const participants = has ? d.data.participants.filter((p) => p !== id) : [...d.data.participants, id];
      const items = d.data.items.map((it) => (has ? { ...it, people: it.people.filter((p) => p !== id) } : it));
      const payments = has ? d.data.payments.filter((p) => p.personId !== id) : d.data.payments;
      return { ...d, data: { ...d.data, participants, items, payments } };
    });
  }

  async function addMember(name: string) {
    const row = await addUnclaimedMember(groupId, name);
    router.refresh();
    setDraft((d) => ({ ...d, data: { ...d.data, participants: [...d.data.participants, row.id] } }));
    setSheet(null);
  }

  function saveItem(item: ExpenseItem) {
    setDraft((d) => {
      const exists = d.data.items.some((i) => i.id === item.id);
      const items = exists ? d.data.items.map((i) => (i.id === item.id ? item : i)) : [...d.data.items, item];
      return { ...d, data: { ...d.data, items } };
    });
    setSheet(null);
  }
  function deleteItem(id: string) {
    updateData({ items: draft.data.items.filter((i) => i.id !== id) });
    setSheet(null);
  }

  function saveCharge(charge: ExpenseCharge) {
    setDraft((d) => {
      const exists = d.data.charges.some((c) => c.id === charge.id);
      const charges = exists ? d.data.charges.map((c) => (c.id === charge.id ? charge : c)) : [...d.data.charges, charge];
      return { ...d, data: { ...d.data, charges } };
    });
    setSheet(null);
  }
  function deleteCharge(id: string) {
    updateData({ charges: draft.data.charges.filter((c) => c.id !== id) });
    setSheet(null);
  }
  function addPreset(kind: "vat" | "service") {
    const preset: ExpenseCharge =
      kind === "vat"
        ? { id: crypto.randomUUID(), name: "VAT", kind: "vat", mode: "percent", value: 13, basis: "after" }
        : { id: crypto.randomUUID(), name: "Service charge", kind: "service", mode: "percent", value: 10, basis: "before" };
    updateData({ charges: [...draft.data.charges, preset] });
  }

  function savePayment(payment: ExpensePayment) {
    setDraft((d) => {
      const exists = d.data.payments.some((p) => p.id === payment.id);
      const payments = exists ? d.data.payments.map((p) => (p.id === payment.id ? payment : p)) : [...d.data.payments, payment];
      return { ...d, data: { ...d.data, payments } };
    });
    setSheet(null);
  }
  function deletePayment(id: string) {
    updateData({ payments: draft.data.payments.filter((p) => p.id !== id) });
    setSheet(null);
  }

  async function pickReceipt(file: File) {
    setUploadErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const path = await uploadReceipt(groupId, fd);
      setDraft((d) => ({ ...d, receiptPath: path }));
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed. You can still enter items by hand.");
    } finally {
      setUploading(false);
    }
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!draft.title.trim()) errs.push("Give the expense a name.");
    if (!draft.data.participants.length) errs.push("Add at least one participant.");
    draft.data.items.forEach((it, i) => {
      const nm = it.name || `Item ${i + 1}`;
      if (toMinor(it.total) < 0) errs.push(`${nm}: price can't be negative.`);
      const ppl = it.people.filter((p) => draft.data.participants.includes(p));
      if (toMinor(it.total) > 0 && !ppl.length) errs.push(`${nm}: nobody is assigned.`);
      if (it.mode === "custom" && ppl.length) {
        const s = ppl.reduce((a, p) => a + toMinor((it.custom || {})[p] || 0), 0);
        if (s !== toMinor(it.total)) errs.push(`${nm}: custom split is ${money(s)}, needs ${money(toMinor(it.total))}.`);
      }
    });
    draft.data.payments.forEach((p) => {
      if (toMinor(p.amount) < 0) errs.push("A payment amount is negative.");
    });
    return errs;
  }

  function handleSave() {
    const errs = validate();
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    const fresh = result.settlement.map((s) => s.from + ">" + s.to);
    const settledPairs = (draft.data.settledPairs || []).filter((p) => fresh.includes(p));
    startTransition(async () => {
      try {
        const id = await saveExpense(groupId, {
          id: draft.id,
          title: draft.title.trim(),
          date: draft.date,
          location: draft.location,
          currency: draft.currency,
          notes: draft.notes,
          receiptPath: draft.receiptPath,
          data: { ...draft.data, settledPairs },
        });
        // The editor is a full-screen overlay held open by the PARENT's local
        // state (not by the URL) — router.push alone navigates the page
        // behind it, but the overlay stays mounted on top unless we also
        // close it, which looked like "nothing happened, still on the same
        // page" even though the save succeeded.
        onClose();
        router.push(`/g/${groupId}/expenses/${id}`);
        router.refresh();
      } catch (e) {
        setErrors([e instanceof Error ? e.message : "Couldn't save — try again."]);
      }
    });
  }

  return (
    <div className="overlay">
      <div className="obar">
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="ttl">{existing ? "Edit expense" : "New expense"}</div>
        <button className="btn primary sm" onClick={handleSave} disabled={pending}>
          {pending ? <Spinner size={14} /> : "Save"}
        </button>
      </div>
      <div className="obody">
        {errors.length > 0 && (
          <div className="banner bad" style={{ margin: "0 0 12px" }}>
            <ul style={{ margin: "0 0 0 16px" }}>
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="block" style={{ padding: 14 }}>
          <label className="field">
            <span className="lb">What / where</span>
            <input type="text" autoComplete="off" placeholder="Dinner at Roadhouse" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label className="field">
              <span className="lb">Date</span>
              <input type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
            </label>
            <label className="field">
              <span className="lb">Currency</span>
              <select value={draft.currency} onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field" style={{ marginBottom: 0 }}>
            <span className="lb">
              Location <span className="muted">(optional)</span>
            </span>
            <input type="text" autoComplete="off" placeholder="Roadhouse Cafe, Thamel" value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} />
          </label>
        </div>

        <div className="block" style={{ padding: 14 }}>
          <div className="lb" style={{ marginBottom: 8 }}>
            Who&apos;s in <span className="muted">· {draft.data.participants.length} selected</span>
          </div>
          <div className="chips">
            {members.map((m) => (
              <button key={m.id} type="button" className={`chip ${draft.data.participants.includes(m.id) ? "on" : ""}`} onClick={() => toggleParticipant(m.id)}>
                <Avatar id={m.id} name={m.display_name} size="sm" /> {m.display_name}
              </button>
            ))}
            <button type="button" className="chip add" onClick={() => setSheet({ type: "addMember" })}>
              + New member
            </button>
          </div>
        </div>

        <div className="block">
          <div className="bh">
            <span className="bt">Items</span>
            <span className="muted mono">
              {currencySymbol(draft.currency)} {money(t.subtotal)}
            </span>
          </div>
          {draft.data.items.map((it) => {
            const ppl = it.people.filter((p) => draft.data.participants.includes(p));
            return (
              <button key={it.id} className="li" onClick={() => setSheet({ type: "item", item: it })}>
                <span className="grow">
                  <span className="nm">{it.name || "Item"}</span>
                  <br />
                  <span className="sub">
                    {ppl.length ? ppl.map((p) => members.find((m) => m.id === p)?.display_name.split(" ")[0]).join(", ") : "⚠ nobody assigned"}
                    {it.mode === "custom" ? " · custom" : ""}
                  </span>
                </span>
                <span className="amt">{money(toMinor(it.total))}</span>
              </button>
            );
          })}
          <button className="li" style={{ color: "var(--accent)", fontWeight: 700 }} onClick={() => setSheet({ type: "item", item: null })}>
            + Add item
          </button>
        </div>

        <div className="block" style={{ padding: 14 }}>
          <div className="lb" style={{ marginBottom: 8 }}>
            Discount
          </div>
          <div className="seg" style={{ marginBottom: 10 }}>
            {(["none", "percent", "fixed"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={draft.data.discount.mode === m ? "on" : ""}
                onClick={() => updateData({ discount: { mode: m, value: m === "none" ? 0 : draft.data.discount.value } })}
              >
                {m === "none" ? "None" : m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          {draft.data.discount.mode !== "none" && (
            <>
              <input
                type="number"
                className="mono"
                inputMode="decimal"
                min={0}
                step="any"
                value={draft.data.discount.value || ""}
                placeholder={draft.data.discount.mode === "percent" ? "20 (%)" : "1000"}
                onChange={(e) => updateData({ discount: { ...draft.data.discount, value: parseFloat(e.target.value) || 0 } })}
              />
              <p className="muted" style={{ marginTop: 6 }}>
                − {currencySymbol(draft.currency)} {money(t.discountTotal)} off, split by what each person ordered
              </p>
            </>
          )}
        </div>

        <div className="block">
          <div className="bh">
            <span className="bt">Taxes &amp; charges</span>
            <span className="muted mono">
              {currencySymbol(draft.currency)} {money(t.chargesTotal)}
            </span>
          </div>
          {draft.data.charges.map((c) => {
            const cr = result.chargeResults.find((x) => x.charge === c);
            return (
              <button key={c.id} className="li" onClick={() => setSheet({ type: "charge", charge: c })}>
                <span className="grow">
                  <span className="nm">{c.name || CHARGE_LABEL[c.kind]}</span>
                  <br />
                  <span className="sub">
                    {c.mode === "percent" ? c.value + "%" : `${currencySymbol(draft.currency)} ${money(toMinor(c.value))}`} · {c.basis === "before" ? "before" : "after"} discount
                  </span>
                </span>
                <span className="amt">{money(cr?.total || 0)}</span>
              </button>
            );
          })}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "12px 14px", borderTop: "1px solid var(--line)" }}>
            <button className="btn sm ghost" type="button" onClick={() => addPreset("vat")}>
              + VAT 13%
            </button>
            <button className="btn sm ghost" type="button" onClick={() => addPreset("service")}>
              + Service 10%
            </button>
            <button className="btn sm ghost" type="button" onClick={() => setSheet({ type: "charge", charge: null })}>
              + Other
            </button>
          </div>
        </div>

        <div className="block">
          <div className="bh">
            <span className="bt">Who paid</span>
            <span className="muted mono">
              {currencySymbol(draft.currency)} {money(t.totalPaid)} / {money(t.grandTotal)}
            </span>
          </div>
          {draft.data.payments.map((p) => (
            <button key={p.id} className="li" onClick={() => setSheet({ type: "payment", payment: p })}>
              <Avatar id={p.personId} name={members.find((m) => m.id === p.personId)?.display_name || "?"} size="sm" />
              <span className="grow">
                <span className="nm">{members.find((m) => m.id === p.personId)?.display_name || "(removed)"}</span>
              </span>
              <span className="amt">{money(toMinor(p.amount))}</span>
            </button>
          ))}
          <button className="li" style={{ color: "var(--accent)", fontWeight: 700 }} onClick={() => setSheet({ type: "payment", payment: null })}>
            + Record a payment
          </button>
        </div>

        <div className="block" style={{ padding: 14 }}>
          <label className="field">
            <span className="lb">
              Notes <span className="muted">(optional)</span>
            </span>
            <textarea placeholder="Anything to remember…" value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
          </label>
          <div className="lb" style={{ marginBottom: 8 }}>
            Receipt photo <span className="muted">(optional)</span>
          </div>
          {draft.receiptPath ? (
            <button className="btn ghost sm danger" onClick={() => setDraft((d) => ({ ...d, receiptPath: null }))}>
              Remove photo
            </button>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => e.target.files?.[0] && pickReceipt(e.target.files[0])}
              />
              {uploading && <p className="muted">Uploading…</p>}
              {uploadErr && <p className="muted">{uploadErr}</p>}
            </>
          )}
        </div>
      </div>

      <div className="esum">
        <div className="line">
          <span>Subtotal</span>
          <span className="mono">
            {currencySymbol(draft.currency)} {money(t.subtotal)}
          </span>
        </div>
        {t.discountTotal > 0 && (
          <div className="line">
            <span>Discount</span>
            <span className="mono">
              − {currencySymbol(draft.currency)} {money(t.discountTotal)}
            </span>
          </div>
        )}
        {t.chargesTotal > 0 && (
          <div className="line">
            <span>Taxes &amp; charges</span>
            <span className="mono">
              + {currencySymbol(draft.currency)} {money(t.chargesTotal)}
            </span>
          </div>
        )}
        <div className="line tot">
          <span>Bill total</span>
          <span className="mono">
            {currencySymbol(draft.currency)} {money(t.grandTotal)}
          </span>
        </div>
        {t.totalPaid > 0 && Math.abs(result.paymentGap) >= 1 && (
          <div className="line" style={{ color: `var(--${result.paymentGap < 0 ? "owe" : "warn"})` }}>
            <span>{result.paymentGap < 0 ? "Still unpaid" : "Overpaid"}</span>
            <span className="mono">
              {currencySymbol(draft.currency)} {money(Math.abs(result.paymentGap))}
            </span>
          </div>
        )}
      </div>

      {sheet?.type === "item" && (
        <ItemSheet
          item={sheet.item}
          participants={draft.data.participants}
          members={members}
          onClose={() => setSheet(null)}
          onSave={saveItem}
          onDelete={() => sheet.item && deleteItem(sheet.item.id)}
        />
      )}
      {sheet?.type === "charge" && (
        <ChargeSheet charge={sheet.charge} onClose={() => setSheet(null)} onSave={saveCharge} onDelete={() => sheet.charge && deleteCharge(sheet.charge.id)} />
      )}
      {sheet?.type === "payment" && (
        <PaymentSheet
          payment={sheet.payment}
          participants={draft.data.participants}
          members={members}
          currency={draft.currency}
          remainingMinor={t.grandTotal - t.totalPaid + (sheet.payment ? toMinor(sheet.payment.amount) : 0)}
          onClose={() => setSheet(null)}
          onSave={savePayment}
          onDelete={() => sheet.payment && deletePayment(sheet.payment.id)}
        />
      )}
      {sheet?.type === "addMember" && <AddMemberSheet onClose={() => setSheet(null)} onAdd={addMember} />}
    </div>
  );
}

function AddMemberSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        <h3>Add member</h3>
        <p className="sh-sub">They can claim this spot later by joining with an invite link.</p>
        <label className="field">
          <span className="lb">Name</span>
          <input type="text" autoComplete="off" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button
          className="btn primary block"
          disabled={busy || !name.trim()}
          onClick={async () => {
            setBusy(true);
            await onAdd(name.trim());
          }}
        >
          Add &amp; select
        </button>
      </div>
    </div>
  );
}
