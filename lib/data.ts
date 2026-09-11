import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type DB = SupabaseClient<Database>;

// Memoized per request: the group layout and the page rendering inside it
// both need the group/members/membership, and without this each was
// re-querying Supabase separately for the exact same rows. `cache()` dedupes
// by argument identity, which is why `supabaseServer()` is itself cached
// (see lib/supabase/server.ts) — otherwise "the same call" would never match
// because each page would hand in a different client instance.

export const getGroup = cache(async (supabase: DB, groupId: string) => {
  const { data } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
  return data;
});

export const getMyMembership = cache(async (supabase: DB, groupId: string, userId: string) => {
  const { data } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
});

export const getGroupMembers = cache(async (supabase: DB, groupId: string) => {
  const { data } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .order("display_name", { ascending: true });
  return data || [];
});

export const getGroupExpenses = cache(async (supabase: DB, groupId: string) => {
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("group_id", groupId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  return data || [];
});

export const getExpense = cache(async (supabase: DB, expenseId: string) => {
  const { data } = await supabase.from("expenses").select("*").eq("id", expenseId).maybeSingle();
  return data;
});
