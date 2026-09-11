"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { PersonBreakdownSheet } from "@/components/PersonBreakdownSheet";
import { ExpenseEditor } from "@/components/expense-editor/ExpenseEditor";
import { CHARGE_LABEL, computeExpense } from "@/lib/calc";
import { currencySymbol, memberName, money, prettyDate } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { deleteExpense, updateExpenseData } from "@/lib/actions";
import type { Expense, GroupMember } from "@/lib/types";

export function ExpenseDetail({
  groupId,
  expense,
  members,
  meId,
  receiptSignedUrl,
}: {
  groupId: string;
  expense: Expense;
  members: GroupMember[];
  meId: string | null;
  receiptSignedUrl: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [breakdownFor, setBreakdownFor] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const r = useMemo(() => computeExpense({ data: expense.data }), [expense.data]);
  const t = r.totals;
  const status = statusOf(expense);
  const cur = expense.currency;
  const mine = meId && r.parts.includes(meId) ? r.per[meId] : null;

  function toggleSettled(from: string, to: string) {
    const key = `${from}>${to}`;
    const set = new Set(expense.data.settledPairs || []);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    startTransition(async () => {
      await updateExpenseData(groupId, expense.id, { ...expense.data, settledPairs: [...set] });
      router.refresh();
    });
  }

  function toggleForceSettled() {
    startTransition(async () => {
      await updateExpenseData(groupId, expense.id, { ...expense.data, forceSettled: !expense.data.forceSettled });
      router.refresh();
    });
  }

  if (editing) {
    return <ExpenseEditor groupId={groupId} defaultCurrency={cur} members={members} existing={expense} onClose={() => setEditing(false)} />;
  }

  return (
    <div className="overlay">
      <div className="obar">
        <button className="icon-btn" onClick={() => router.back()} aria-label="Close">
          ✕
        </button>
        <div className="ttl">{expense.title}</div>
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit">
          ✎
        </button>
      </div>
      <div className="obody">
        <div className="card pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div>
              <div className="muted">
                {expense.location ? expense.location + " · " : ""}
                {prettyDate(expense.date)}
              </div>
              <div style={{ fontFamily: "var(--f-display)", fontSize: 34, letterSpacing: 0.5, marginTop: 2 }}>
                {currencySymbol(cur)} {money(t.grandTotal)}
              </div>
            </div>
            <span className={`tag ${status}`}>{status}</span>
          </div>
          <div className="avstack" style={{ marginTop: 10 }}>
            {r.parts.map((p) => (
              <Avatar key={p} id={p} name={memberName(members, p)} />
            ))}
          </div>
          <div className="receipt" style={{ marginTop: 14 }}>
            <div className="rr">
              <span>Subtotal</span>
              <span>{money(t.subtotal)}</span>
            </div>
            {t.discountTotal > 0 && (
              <div className="rr">
                <span>Discount</span>
                <span className="neg">− {money(t.discountTotal)}</span>
              </div>
            )}
            {r.chargeResults.map((c, i) => (
              <div className="rr" key={i}>
                <span>{c.charge.name || CHARGE_LABEL[c.charge.kind]}</span>
                <span>+ {money(c.total)}</span>
              </div>
            ))}
            <div className="rr rule big">
              <span>Total</span>
              <span>{money(t.grandTotal)}</span>
            </div>
            <div className="rr">
              <span>Paid</span>
              <span>{money(t.totalPaid)}</span>
            </div>
          </div>
          {Math.abs(r.paymentGap) >= 1 && (
            <div className="warnbox">
              Payments recorded ({currencySymbol(cur)} {money(t.totalPaid)}) don&apos;t match the bill ({currencySymbol(cur)} {money(t.grandTotal)}). Settlement
              below covers the difference between friends.
            </div>
          )}
        </div>

        {mine && (
          <div className="card pad" style={{ marginTop: 12 }}>
            <div className="eyebrow" style={{ margin: "0 0 8px" }}>
              Your summary
            </div>
            <div className="receipt">
              <div className="rr">
                <span>You paid</span>
                <span>{money(mine.paid)}</span>
              </div>
              <div className="rr">
                <span>Your share</span>
                <span>{money(mine.final)}</span>
              </div>
              <div className="rr rule big">
                <span>{mine.balance >= 0 ? "You should receive" : "You need to pay"}</span>
                <span className={mine.balance >= 0 ? "pos" : "neg"}>
                  {currencySymbol(cur)} {money(Math.abs(mine.balance))}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="card pad" style={{ marginTop: 12 }}>
          <div className="eyebrow" style={{ margin: "0 0 4px" }}>
            Settlement
          </div>
          <p className="muted" style={{ marginBottom: 6 }}>
            Fewest possible transfers. Tap ✓ once someone has paid.
          </p>
          {r.settlement.length === 0 ? (
            <p className="muted">All square — nobody owes anyone.</p>
          ) : (
            r.settlement.map((s, i) => {
              const key = `${s.from}>${s.to}`;
              const done = (expense.data.settledPairs || []).includes(key);
              return (
                <div className="settle-row" key={i}>
                  <Avatar id={s.from} name={memberName(members, s.from)} size="sm" />
                  <span className="flow">
                    {memberName(members, s.from).split(" ")[0]} <span className="muted">→</span> <span className="to">{memberName(members, s.to).split(" ")[0]}</span>
                  </span>
                  <span className="amt">
                    {currencySymbol(cur)} {money(s.amount)}
                  </span>
                  <button className={`ck ${done ? "done" : ""}`} disabled={pending} onClick={() => toggleSettled(s.from, s.to)} aria-label="Mark paid">
                    {done ? "✓" : ""}
                  </button>
                </div>
              );
            })
          )}
          <button className="btn ghost sm block" style={{ marginTop: 10 }} disabled={pending} onClick={toggleForceSettled}>
            {expense.data.forceSettled ? "Reopen expense" : "Mark whole expense settled"}
          </button>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ padding: "14px 16px 4px" }}>
            <span className="eyebrow" style={{ margin: 0 }}>
              Per person
            </span>
          </div>
          {r.parts.map((pid) => {
            const pr = r.per[pid];
            return (
              <button key={pid} className="li" onClick={() => setBreakdownFor(pid)}>
                <Avatar id={pid} name={memberName(members, pid)} size="sm" />
                <span className="grow">
                  <span className="nm">{memberName(members, pid)}</span>
                  <br />
                  <span className="sub">
                    share {currencySymbol(cur)} {money(pr.final)} · paid {money(pr.paid)}
                  </span>
                </span>
                <span className="amt" style={{ color: `var(--${pr.balance >= 0 ? "receive" : "owe"})` }}>
                  {pr.balance >= 0 ? "+" : "−"}
                  {money(Math.abs(pr.balance))}
                </span>
              </button>
            );
          })}
        </div>

        {receiptSignedUrl && (
          <div className="card pad" style={{ marginTop: 12 }}>
            <div className="eyebrow" style={{ margin: "0 0 8px" }}>
              Receipt
            </div>
            <a href={receiptSignedUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={receiptSignedUrl} alt="Receipt" style={{ borderRadius: 10, border: "1px solid var(--line)" }} />
            </a>
          </div>
        )}
        {expense.notes && (
          <div className="card pad" style={{ marginTop: 12 }}>
            <div className="eyebrow" style={{ margin: "0 0 6px" }}>
              Notes
            </div>
            <p>{expense.notes}</p>
          </div>
        )}

        <button
          className="btn danger block"
          style={{ marginTop: 16 }}
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete "${expense.title}"? This can't be undone.`)) return;
            startTransition(async () => {
              await deleteExpense(groupId, expense.id);
              router.push(`/g/${groupId}/expenses`);
              router.refresh();
            });
          }}
        >
          Delete expense
        </button>
      </div>

      {breakdownFor && <PersonBreakdownSheet name={memberName(members, breakdownFor)} currency={cur} result={r.per[breakdownFor]} onClose={() => setBreakdownFor(null)} />}
    </div>
  );
}
