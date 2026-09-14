"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { ExpenseData } from "@/lib/calc";

function inviteCode() {
  return randomBytes(6).toString("base64url"); // short, URL-safe
}

async function requireUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return { supabase, user };
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/");
}

/** Returns the new group's id — the caller (client) navigates on success so
 * it can also show an error inline without fighting Next's redirect-in-try/catch gotcha. */
export async function createGroup(name: string, currency: string): Promise<string> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_group", { p_name: name, p_currency: currency });
  if (error) throw new Error(error.message);
  return data;
}

/** Returns the joined group's id — see createGroup's note on why this doesn't redirect itself. */
export async function joinGroupByCode(code: string): Promise<string> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("redeem_invite", { p_code: code.trim() });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * `memberId` omitted: a generic "join this group" link — redeeming it always
 * creates a brand-new member, never guesses an existing one.
 * `memberId` given: a personal invite for exactly that (usually unclaimed)
 * member row — redeeming it can only claim that row.
 */
export async function createInvite(groupId: string, memberId?: string) {
  const { supabase, user } = await requireUser();
  const code = inviteCode();
  const { error } = await supabase
    .from("group_invites")
    .insert({ group_id: groupId, code, created_by: user.id, member_id: memberId || null });
  if (error) throw new Error(error.message);
  revalidatePath(`/g/${groupId}/members`);
  return code;
}

export async function revokeInvite(groupId: string, inviteId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("group_invites").update({ revoked: true }).eq("id", inviteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/g/${groupId}/members`);
}

export async function addUnclaimedMember(groupId: string, name: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, display_name: name.trim(), role: "member" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/g/${groupId}`, "layout");
  return data;
}

export async function removeMember(groupId: string, memberId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("group_members").delete().eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath(`/g/${groupId}`, "layout");
}

/** Does not redirect — the caller navigates on success (see createGroup's note). */
export async function leaveGroup(groupId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

export async function renameGroup(groupId: string, name: string, currency: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("groups").update({ name: name.trim(), currency_default: currency }).eq("id", groupId);
  if (error) throw new Error(error.message);
  revalidatePath(`/g/${groupId}`, "layout");
}

/** Does not redirect — the caller navigates on success (see createGroup's note). */
export async function deleteGroup(groupId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw new Error(error.message);
}

export interface ExpenseInput {
  id?: string;
  title: string;
  date: string;
  location?: string;
  currency: string;
  notes?: string;
  receiptPath?: string | null;
  data: ExpenseData;
}

export async function saveExpense(groupId: string, input: ExpenseInput) {
  const { supabase, user } = await requireUser();
  const row = {
    id: input.id,
    group_id: groupId,
    title: input.title,
    date: input.date,
    location: input.location || null,
    currency: input.currency,
    notes: input.notes || null,
    receipt_url: input.receiptPath ?? null,
    data: input.data,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("expenses").upsert(row).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath(`/g/${groupId}`);
  revalidatePath(`/g/${groupId}/expenses`);
  return data.id;
}

export async function updateExpenseData(groupId: string, expenseId: string, data: ExpenseData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("expenses").update({ data, updated_at: new Date().toISOString() }).eq("id", expenseId);
  if (error) throw new Error(error.message);
  revalidatePath(`/g/${groupId}/expenses/${expenseId}`);
}

/** Does not redirect — the caller navigates on success (see createGroup's note). */
export async function deleteExpense(groupId: string, expenseId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) throw new Error(error.message);
  revalidatePath(`/g/${groupId}`);
  revalidatePath(`/g/${groupId}/expenses`);
}

export async function uploadReceipt(groupId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const file = formData.get("file") as File | null;
  if (!file || !file.size) throw new Error("No file provided.");
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${groupId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** Updates the account-wide profile name (used as the default when joining a NEW group). */
export async function saveDisplayName(name: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/groups");
}

/** Renames a member WITHIN one group (that group's group_members row) — how they appear there specifically. */
export async function renameMember(groupId: string, memberId: string, name: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("group_members").update({ display_name: name.trim() }).eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath(`/g/${groupId}`, "layout");
}
