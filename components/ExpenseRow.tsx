import Link from "next/link";
import { computeExpense, remainingBalances } from "@/lib/calc";
import { currencySymbol, emojiFor, money, prettyDate } from "@/lib/format";
import { statusOf } from "@/lib/status";
import type { Expense } from "@/lib/types";

export function ExpenseRow({ groupId, expense, meId }: { groupId: string; expense: Expense; meId: string | null }) {
  const r = computeExpense({ data: expense.data });
  const status = statusOf(expense);
  const isMine = !!meId && expense.data.participants.includes(meId);
  // The REMAINING balance, not the original one — a settlement leg you've
  // already ticked off inside the expense must stop showing here too,
  // otherwise this badge disagrees with "What you owe / are owed" above it.
  const myRemaining = isMine && meId ? remainingBalances(expense.data)[meId] : 0;

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
        {isMine && status !== "settled" && Math.abs(myRemaining) >= 1 ? (
          <div className={`amt ${myRemaining > 0 ? "pos" : "neg"}`}>
            {myRemaining > 0 ? "get" : "owe"} {currencySymbol(expense.currency)} {money(Math.abs(myRemaining))}
          </div>
        ) : isMine && status !== "settled" ? (
          // The expense overall is still partial/unsettled (someone else's
          // leg is outstanding), but YOUR share is already cleared.
          <span className="tag settled">✓ you&apos;re clear</span>
        ) : (
          <span className={`tag ${status}`}>{status}</span>
        )}
      </span>
    </Link>
  );
}
