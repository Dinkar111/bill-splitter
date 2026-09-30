"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Spinner } from "@/components/Spinner";
import { computeExpense } from "@/lib/calc";
import { currencySymbol, memberName, money, shortDate } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { updateExpenseData } from "@/lib/actions";
import type { Expense, GroupMember } from "@/lib/types";

/**
 * What YOU still owe or are owed, one row per expense — the same settlement
 * legs shown inside each expense's own detail page (respecting whatever
 * mode/collector that expense uses), just filtered down to the ones that
 * touch you and rolled up here so you don't have to open every expense to
 * see where you stand. The ✓ here writes to the exact same place ticking it
 * off inside the expense does, so either one clears it everywhere.
 */
export function MyExpenseSettlements({ groupId, expenses, members, meId }: { groupId: string; expenses: Expense[]; members: GroupMember[]; meId: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [markingKey, setMarkingKey] = useState<string | null>(null);

  if (!meId) return null;

  const rows = expenses.flatMap((exp) => {
    if (!exp.data.participants.includes(meId)) return [];
    if (statusOf(exp) === "settled") return [];
    const r = computeExpense({ data: exp.data });
    const done = new Set(exp.data.settledPairs || []);
    return r.settlement
      .filter((leg) => (leg.from === meId || leg.to === meId) && !done.has(`${leg.from}>${leg.to}`))
      .map((leg) => ({ exp, leg, youPay: leg.from === meId }));
  });

  if (rows.length === 0) {
    // Only worth a reassuring "all clear" if you're actually in an expense —
    // otherwise this is just the ordinary empty-group state shown elsewhere.
    const inAnyExpense = expenses.some((e) => e.data.participants.includes(meId));
    if (!inAnyExpense) return null;
    return (
      <>
        <div className="eyebrow">What you owe / are owed</div>
        <div className="okbox" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>✓</span> You&apos;re all clear — nothing owed either way.
        </div>
      </>
    );
  }

  function markPaid(exp: Expense, from: string, to: string, key: string) {
    const set = new Set(exp.data.settledPairs || []);
    set.add(`${from}>${to}`);
    setMarkingKey(key);
    startTransition(async () => {
      await updateExpenseData(groupId, exp.id, { ...exp.data, settledPairs: [...set] });
      router.refresh();
      setMarkingKey(null);
    });
  }

  return (
    <>
      <div className="eyebrow">What you owe / are owed</div>
      <div className="card pad">
        {rows.map(({ exp, leg, youPay }, i) => {
          const counterpartId = youPay ? leg.to : leg.from;
          const key = `${exp.id}-${leg.from}-${leg.to}`;
          const isMarking = markingKey === key;
          return (
            <div className="settle-row" key={key} style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
              <Avatar id={counterpartId} name={memberName(members, counterpartId)} size="sm" />
              <Link href={`/g/${groupId}/expenses/${exp.id}`} className="flow" style={{ minWidth: 0, display: "block" }}>
                {youPay ? "You" : memberName(members, counterpartId).split(" ")[0]} <span className="muted">→</span>{" "}
                {youPay ? memberName(members, counterpartId).split(" ")[0] : "You"}
                <br />
                <span className="muted" style={{ fontSize: 11.5, fontWeight: 400 }}>
                  {exp.title} · {shortDate(exp.date)}
                </span>
              </Link>
              <span className="amt" style={{ color: `var(--${youPay ? "owe" : "receive"})` }}>
                {youPay ? "−" : "+"}
                {currencySymbol(exp.currency)} {money(leg.amount)}
              </span>
              <button className="ck" disabled={markingKey !== null} onClick={() => markPaid(exp, leg.from, leg.to, key)} aria-label="Mark paid">
                {isMarking && <Spinner size={12} />}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
