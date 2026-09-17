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

export interface KnownPerson {
  /** The real account id if they have one, else a stable key for a ghost (unclaimed) name. */
  key: string;
  userId: string | null;
  displayName: string;
}

/**
 * Everyone the current user shares a group with, deduped — for picking
 * people to add straight into a brand-new group instead of starting from
 * scratch. Real accounts dedupe by user id; ghost (unclaimed) members dedupe
 * by name, since they have no account to match on.
 */
export const getKnownPeople = cache(async (supabase: DB, userId: string): Promise<KnownPerson[]> => {
  const { data: myGroups } = await supabase.from("group_members").select("group_id").eq("user_id", userId);
  const groupIds = [...new Set((myGroups || []).map((m) => m.group_id))];
  if (!groupIds.length) return [];

  const { data: rows } = await supabase.from("group_members").select("*").in("group_id", groupIds);
  const seen = new Set<string>();
  const out: KnownPerson[] = [];
  for (const m of rows || []) {
    if (m.user_id === userId) continue; // that's you
    const key = m.user_id || `ghost:${m.display_name.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, userId: m.user_id, displayName: m.display_name });
  }
  return out.sort((a, b) => a.displayName.localeCompare(b.displayName));
});
