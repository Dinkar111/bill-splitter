import { redirect } from "next/navigation";
import { getAuthedUser, supabaseServer } from "@/lib/supabase/server";
import { getGroupExpenses, getGroupMembers, getMyMembership } from "@/lib/data";
import { computeExpense, remainingBalances } from "@/lib/calc";
import { currencySymbol, money } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { ExpenseRow } from "@/components/ExpenseRow";
import { MyExpenseSettlements } from "@/components/MyExpenseSettlements";

export default async function GroupHomePage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await getAuthedUser();
  if (!user) redirect("/");
  const supabase = await supabaseServer();

  const [expenses, membership, members] = await Promise.all([
    getGroupExpenses(supabase, groupId),
    getMyMembership(supabase, groupId, user.id),
    getGroupMembers(supabase, groupId),
  ]);
  const meId = membership?.id || null;
  const currency = expenses[0]?.currency || "NPR";

  let owed = 0;
  let owe = 0;
  let totalSpent = 0;
  let unsettled = 0;
  for (const exp of expenses) {
    const r = computeExpense({ data: exp.data });
    totalSpent += r.totals.grandTotal;
    const status = statusOf(exp);
    if (status !== "settled") {
      unsettled++;
      if (meId && exp.data.participants.includes(meId)) {
        // "Remaining" (not raw) balance, so payments already ticked off
        // inside an expense stop counting here — otherwise a half-settled
        // expense would keep showing its full original amount.
        const b = remainingBalances(exp.data)[meId];
        if (b > 0) owed += b;
        else owe += -b;
      }
    }
  }

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const displayName = membership?.display_name;

  return (
    <>
      <div className="hero">
        <div className="greet">
          {greet}
          {displayName ? (
            <>
              , <b>{displayName}</b> 👋
            </>
          ) : (
            " 👋"
          )}
        </div>
        <div className="split2">
          <div className="bignum pos">
            <div className="k">You are owed</div>
            <div className="v">
              {currencySymbol(currency)}&thinsp;{money(owed)}
            </div>
          </div>
          <div className="bignum neg">
            <div className="k">You owe</div>
            <div className="v">
              {currencySymbol(currency)}&thinsp;{money(owe)}
            </div>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat">
            <div className="v">
              {currencySymbol(currency)}&thinsp;{money(totalSpent)}
            </div>
            <div className="k">Total spent</div>
          </div>
          <div className="stat">
            <div className="v">{expenses.length}</div>
            <div className="k">Expenses</div>
          </div>
          <div className="stat">
            <div className="v">{unsettled}</div>
            <div className="k">Unsettled</div>
          </div>
        </div>
      </div>

      <MyExpenseSettlements groupId={groupId} expenses={expenses} members={members} meId={meId} />

      <div className="eyebrow">Recent expenses</div>
      {expenses.length === 0 ? (
        <div className="empty">
          <div className="big">≈ ≈ ≈</div>
          <h3 style={{ fontFamily: "var(--f-display)", fontSize: 20, color: "var(--ink)", margin: "8px 0 4px" }}>No expenses yet</h3>
          <p>Tap + to split your first bill.</p>
        </div>
      ) : (
        <div className="exp-list">
          {expenses.slice(0, 6).map((e) => (
            <ExpenseRow key={e.id} groupId={groupId} expense={e} meId={meId} />
          ))}
        </div>
      )}
    </>
  );
}
