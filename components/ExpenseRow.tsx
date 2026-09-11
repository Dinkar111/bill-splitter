import Link from "next/link";
import { computeExpense } from "@/lib/calc";
import { currencySymbol, emojiFor, money, prettyDate } from "@/lib/format";
import { statusOf } from "@/lib/status";
import type { Expense } from "@/lib/types";

export function ExpenseRow({ groupId, expense, meId }: { groupId: string; expense: Expense; meId: string | null }) {
  const r = computeExpense({ data: expense.data });
  const status = statusOf(expense);
  const mine = meId && expense.data.participants.includes(meId) ? r.per[meId] : null;

  return (
    <Link href={`/g/${groupId}/expenses/${expense.id}`} className="exp">
      <span className="emoji">{emojiFor(expense.title + " " + (expense.location || ""))}</span>
      <span className="mid">
        <div className="t">{expense.title}</div>
        <div className="m mono">
          {currencySymbol(expense.currency)} {money(r.totals.grandTotal)} · {expense.data.participants.length} ppl · {prettyDate(expense.date)}
        </div>
      </span>
      <span className="r">
        {mine && status !== "settled" && Math.abs(mine.balance) >= 1 ? (
          <div className={`amt ${mine.balance > 0 ? "pos" : "neg"}`}>
            {mine.balance > 0 ? "get" : "owe"} {currencySymbol(expense.currency)} {money(Math.abs(mine.balance))}
          </div>
        ) : (
          <span className={`tag ${status}`}>{status}</span>
        )}
      </span>
    </Link>
  );
}
