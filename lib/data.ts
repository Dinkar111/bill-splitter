import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type DB = SupabaseClient<Database>;

export async function getGroup(supabase: DB, groupId: string) {
  const { data } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
  return data;
}

export async function getMyMembership(supabase: DB, groupId: string, userId: string) {
  const { data } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function getGroupMembers(supabase: DB, groupId: string) {
  const { data } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .order("display_name", { ascending: true });
  return data || [];
}

export async function getGroupExpenses(supabase: DB, groupId: string) {
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("group_id", groupId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getExpense(supabase: DB, expenseId: string) {
  const { data } = await supabase.from("expenses").select("*").eq("id", expenseId).maybeSingle();
  return data;
}
