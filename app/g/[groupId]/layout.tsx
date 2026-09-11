import { notFound, redirect } from "next/navigation";
import { getAuthedUser, supabaseServer } from "@/lib/supabase/server";
import { getGroup, getGroupMembers, getMyMembership } from "@/lib/data";
import { GroupChrome } from "@/components/GroupChrome";

export default async function GroupLayout({ children, params }: { children: React.ReactNode; params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await getAuthedUser();
  if (!user) redirect("/");

  const supabase = await supabaseServer();
  const [group, membership, members] = await Promise.all([
    getGroup(supabase, groupId),
    getMyMembership(supabase, groupId, user.id),
    getGroupMembers(supabase, groupId),
  ]);
  if (!group || !membership) notFound();

  return (
    <GroupChrome group={group} members={members}>
      {children}
    </GroupChrome>
  );
}
