import { redirect } from "next/navigation";
import { getAuthedUser, supabaseServer } from "@/lib/supabase/server";
import { getGroupExpenses, getMyMembership } from "@/lib/data";
import { ExpensesList } from "@/components/ExpensesList";

export default async function ExpensesPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await getAuthedUser();
  if (!user) redirect("/");
  const supabase = await supabaseServer();

  const [expenses, membership] = await Promise.all([getGroupExpenses(supabase, groupId), getMyMembership(supabase, groupId, user.id)]);

  return (
    <>
      <h2 style={{ fontFamily: "var(--f-display)", fontSize: 21, marginBottom: 12 }}>Expenses</h2>
      <ExpensesList groupId={groupId} expenses={expenses} meId={membership?.id || null} />
    </>
  );
}
