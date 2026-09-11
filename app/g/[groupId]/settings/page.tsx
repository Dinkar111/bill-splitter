import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getGroup, getMyMembership } from "@/lib/data";
import { SettingsView } from "@/components/SettingsView";

export default async function SettingsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [group, membership] = await Promise.all([getGroup(supabase, groupId), getMyMembership(supabase, groupId, user.id)]);
  if (!group || !membership) redirect("/groups");

  return <SettingsView group={group} membership={membership} />;
}
