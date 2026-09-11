import { redirect } from "next/navigation";
import { getAuthedUser, supabaseServer } from "@/lib/supabase/server";
import { getGroupExpenses, getGroupMembers, getMyMembership } from "@/lib/data";
import { MembersView } from "@/components/MembersView";

export default async function MembersPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await getAuthedUser();
  if (!user) redirect("/");
  const supabase = await supabaseServer();

  const [members, expenses, membership, invites] = await Promise.all([
    getGroupMembers(supabase, groupId),
    getGroupExpenses(supabase, groupId),
    getMyMembership(supabase, groupId, user.id),
    supabase.from("group_invites").select("*").eq("group_id", groupId).eq("revoked", false).order("created_at", { ascending: false }),
  ]);

  return (
    <MembersView
      groupId={groupId}
      members={members}
      expenses={expenses}
      isOwner={membership?.role === "owner"}
      invites={invites.data || []}
    />
  );
}
