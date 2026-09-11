"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { Avatar } from "@/components/Avatar";
import { distribute, toMinor, type ExpenseItem, type SplitMode } from "@/lib/calc";
import { money } from "@/lib/format";
import type { GroupMember } from "@/lib/types";

const CATS: NonNullable<ExpenseItem["kind"]>[] = ["food", "drink", "dessert", "other"];

export function ItemSheet({
  item,
  participants,
  members,
  onClose,
  onSave,
  onDelete,
}: {
  item: ExpenseItem | null;
  participants: string[];
  members: GroupMember[];
  onClose: () => void;
  onSave: (item: ExpenseItem) => void;
  onDelete: () => void;
}) {
  const editing = !!item;
  const [name, setName] = useState(item?.name || "");
  const [kind, setKind] = useState<NonNullable<ExpenseItem["kind"]>>(item?.kind || "food");
  const [qty, setQty] = useState(item?.qty || 1);
  const [unitPrice, setUnitPrice] = useState(item?.unitPrice || 0);
  const [total, setTotal] = useState(item?.total ?? 0);
  const [people, setPeople] = useState<Set<string>>(new Set(item?.people?.filter((p) => participants.includes(p)) || participants));
  const [mode, setMode] = useState<SplitMode>(item?.mode || "equal");
  const [custom, setCustom] = useState<Record<string, number>>(item?.custom || {});

  const roster = participants.map((id) => members.find((m) => m.id === id)).filter((m): m is GroupMember => !!m);

  function togglePerson(id: string) {
    setPeople((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        setCustom((c) => (c[id] != null ? c : { ...c, [id]: 0 }));
      }
      return next;
    });
  }

  function setUnit(v: number) {
    setUnitPrice(v);
    if (v) setTotal(+(qty * v).toFixed(2));
  }
  function setQtyVal(v: number) {
    const q = Math.max(1, v || 1);
    setQty(q);
    if (unitPrice) setTotal(+(q * unitPrice).toFixed(2));
  }

  const chosen = [...people];
  const totalMinor = toMinor(total);
  const customSumMinor = chosen.reduce((a, p) => a + toMinor(custom[p] || 0), 0);
  const customDiff = totalMinor - customSumMinor;

  function resetEqual() {
    const w: Record<string, number> = {};
    chosen.forEach((p) => (w[p] = 1));
    const d = distribute(totalMinor, w);
    const next: Record<string, number> = {};
    chosen.forEach((p) => (next[p] = (d[p] || 0) / 100));
    setCustom(next);
  }

  function save() {
    const finalItem: ExpenseItem = {
      id: item?.id || crypto.randomUUID(),
      name: name.trim() || "Item",
      kind,
      qty,
      unitPrice,
      total,
      mode,
      people: chosen,
      custom: mode === "custom" ? Object.fromEntries(chosen.map((p) => [p, custom[p] || 0])) : {},
    };
    onSave(finalItem);
  }

  return (
    <Sheet onClose={onClose}>
      <h3>{editing ? "Edit item" : "Add item"}</h3>
      <label className="field">
        <span className="lb">Item</span>
        <input type="text" autoComplete="off" placeholder="Pizza" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="field">
        <span className="lb">Category</span>
        <div className="seg">
          {CATS.map((c) => (
            <button key={c} type="button" className={kind === c ? "on" : ""} onClick={() => setKind(c)}>
              {c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="row2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="field">
          <span className="lb">Qty</span>
          <input type="number" className="mono" inputMode="numeric" min={1} step={1} value={qty} onChange={(e) => setQtyVal(parseInt(e.target.value) || 1)} />
        </label>
        <label className="field">
          <span className="lb">Unit price</span>
          <input type="number" className="mono" inputMode="decimal" min={0} step="any" value={unitPrice || ""} onChange={(e) => setUnit(parseFloat(e.target.value) || 0)} />
        </label>
      </div>
      <label className="field">
        <span className="lb">Total price</span>
        <input type="number" className="mono" inputMode="decimal" min={0} step="any" value={total || ""} onChange={(e) => setTotal(parseFloat(e.target.value) || 0)} />
      </label>

      <div className="lb" style={{ margin: "2px 0 8px" }}>
        Who had this?
      </div>
      <div className="chips" style={{ marginBottom: 8 }}>
        <button type="button" className="chip" onClick={() => setPeople(new Set(participants))}>
          Everyone
        </button>
        <button type="button" className="chip" onClick={() => setPeople(new Set())}>
          Clear
        </button>
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {roster.map((p) => (
          <button key={p.id} type="button" className={`chip ${people.has(p.id) ? "on" : ""}`} onClick={() => togglePerson(p.id)}>
            <Avatar id={p.id} name={p.display_name} size="sm" /> {p.display_name.split(" ")[0]}
          </button>
        ))}
      </div>

      <div className="field">
        <span className="lb">Split</span>
        <div className="seg">
          <button type="button" className={mode === "equal" ? "on" : ""} onClick={() => setMode("equal")}>
            Equal
          </button>
          <button type="button" className={mode === "custom" ? "on" : ""} onClick={() => setMode("custom")}>
            Custom
          </button>
        </div>
      </div>

      {mode === "custom" && (
        <div>
          {chosen.map((pid) => {
            const m = members.find((x) => x.id === pid);
            return (
              <div key={pid} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Avatar id={pid} name={m?.display_name || "?"} size="sm" />
                <span style={{ flex: 1 }}>{(m?.display_name || "?").split(" ")[0]}</span>
                <input
                  type="number"
                  className="mono"
                  inputMode="decimal"
                  step="any"
                  style={{ width: 110 }}
                  value={custom[pid] ?? ""}
                  onChange={(e) => setCustom((c) => ({ ...c, [pid]: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            );
          })}
          <div className={customDiff === 0 ? "okbox" : "warnbox"}>
            {customDiff === 0
              ? "Adds up ✓"
              : `${money(customSumMinor)} of ${money(totalMinor)} · ${customDiff > 0 ? money(customDiff) + " unassigned" : money(-customDiff) + " over"}`}
          </div>
          <button type="button" className="btn ghost sm" style={{ marginTop: 4 }} onClick={resetEqual}>
            Reset to equal amounts
          </button>
        </div>
      )}

      <button className="btn primary block" style={{ marginTop: 14 }} onClick={save}>
        {editing ? "Save item" : "Add item"}
      </button>
      {editing && (
        <button className="btn danger block" style={{ marginTop: 8 }} onClick={onDelete}>
          Delete item
        </button>
      )}
    </Sheet>
  );
}
