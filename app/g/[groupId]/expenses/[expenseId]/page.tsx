import { notFound, redirect } from "next/navigation";
import { getAuthedUser, supabaseServer } from "@/lib/supabase/server";
import { getExpense, getGroupMembers, getMyMembership } from "@/lib/data";
import { ExpenseDetail } from "@/components/ExpenseDetail";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ groupId: string; expenseId: string }> }) {
  const { groupId, expenseId } = await params;
  const user = await getAuthedUser();
  if (!user) redirect("/");
  const supabase = await supabaseServer();

  const [expense, members, membership] = await Promise.all([
    getExpense(supabase, expenseId),
    getGroupMembers(supabase, groupId),
    getMyMembership(supabase, groupId, user.id),
  ]);
  if (!expense || expense.group_id !== groupId) notFound();

  let receiptSignedUrl: string | null = null;
  if (expense.receipt_url) {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(expense.receipt_url, 3600);
    receiptSignedUrl = data?.signedUrl || null;
  }

  return <ExpenseDetail groupId={groupId} expense={expense} members={members} meId={membership?.id || null} receiptSignedUrl={receiptSignedUrl} />;
}
