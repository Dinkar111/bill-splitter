"use client";

import { useMemo, useState } from "react";
import { ExpenseRow } from "./ExpenseRow";
import { statusOf } from "@/lib/status";
import type { Expense } from "@/lib/types";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unsettled", label: "Unsettled" },
  { key: "settled", label: "Settled" },
  { key: "mine", label: "Mine" },
] as const;

export function ExpensesList({ groupId, expenses, meId }: { groupId: string; expenses: Expense[]; meId: string | null }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return expenses.filter((e) => {
      if (needle && !(e.title + " " + (e.location || "")).toLowerCase().includes(needle)) return false;
      const status = statusOf(e);
      if (filter === "settled" && status !== "settled") return false;
      if (filter === "unsettled" && status === "settled") return false;
      if (filter === "mine" && !(meId && e.data.participants.includes(meId))) return false;
      return true;
    });
  }, [expenses, q, filter, meId]);

  return (
    <>
      <input className="inp" type="text" placeholder="Search name or place…" style={{ marginBottom: 10 }} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips" style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button key={f.key} className={`chip ${filter === f.key ? "on" : ""}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="empty">
          <p>Nothing here. Adjust the filters, or add an expense.</p>
        </div>
      ) : (
        <div className="exp-list">
          {filtered.map((e) => (
            <ExpenseRow key={e.id} groupId={groupId} expense={e} meId={meId} />
          ))}
        </div>
      )}
    </>
  );
}
