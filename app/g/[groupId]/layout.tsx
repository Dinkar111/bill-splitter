import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getGroup, getGroupMembers, getMyMembership } from "@/lib/data";
import { GroupChrome } from "@/components/GroupChrome";

export default async function GroupLayout({ children, params }: { children: React.ReactNode; params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [group, membership] = await Promise.all([getGroup(supabase, groupId), getMyMembership(supabase, groupId, user.id)]);
  if (!group || !membership) notFound();

  const members = await getGroupMembers(supabase, groupId);

  return (
    <GroupChrome group={group} members={members}>
      {children}
    </GroupChrome>
  );
}
