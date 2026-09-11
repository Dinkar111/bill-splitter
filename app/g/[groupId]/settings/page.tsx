import { redirect } from "next/navigation";
import { getAuthedUser, supabaseServer } from "@/lib/supabase/server";
import { getGroup, getMyMembership } from "@/lib/data";
import { SettingsView } from "@/components/SettingsView";

export default async function SettingsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await getAuthedUser();
  if (!user) redirect("/");
  const supabase = await supabaseServer();

  const [group, membership] = await Promise.all([getGroup(supabase, groupId), getMyMembership(supabase, groupId, user.id)]);
  if (!group || !membership) redirect("/groups");

  return <SettingsView group={group} membership={membership} />;
}
