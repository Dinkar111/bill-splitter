#!/usr/bin/env node
/**
 * One-off data migration: copies groups, group_members, and expenses from
 * one Supabase project to another (e.g. moving to a closer region).
 *
 * Auth accounts do NOT transfer — Supabase auth.users is project-specific
 * and password hashes can't be safely copied across projects. Before
 * running this, every real person (not an "unclaimed" ghost member) must
 * sign up again on the NEW project with the SAME email address. The script
 * matches old accounts to new ones by email and rewrites user_id/created_by
 * accordingly. Ghost members (user_id already null) copy across untouched.
 *
 * All other ids (groups.id, group_members.id, expenses.id) are preserved
 * exactly, so expense.data.participants (which references group_members.id,
 * not an account id) stays correct with no rewriting needed.
 *
 * Needs the SERVICE ROLE key for both projects (Project Settings → API Keys
 * → reveal "service_role") — NOT the anon/publishable key, and NEVER put
 * this key in the app itself. Run locally, then discard/rotate it if you're
 * not going to reuse this script.
 *
 * Usage:
 *   OLD_SUPABASE_URL=https://old-ref.supabase.co \
 *   OLD_SERVICE_ROLE_KEY=eyJ... \
 *   NEW_SUPABASE_URL=https://new-ref.supabase.co \
 *   NEW_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/migrate-project.mjs
 *
 * Safe to re-run: every insert uses upsert, so nothing duplicates.
 */
import { createClient } from "@supabase/supabase-js";

const need = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var ${name}`);
    process.exit(1);
  }
  return v;
};

const oldUrl = need("OLD_SUPABASE_URL");
const oldKey = need("OLD_SERVICE_ROLE_KEY");
const newUrl = need("NEW_SUPABASE_URL");
const newKey = need("NEW_SERVICE_ROLE_KEY");

const oldDb = createClient(oldUrl, oldKey, { auth: { persistSession: false } });
const newDb = createClient(newUrl, newKey, { auth: { persistSession: false } });

async function listAllUsers(client) {
  const users = [];
  let page = 1;
  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
    page++;
  }
  return users;
}

function must(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

async function main() {
  console.log("Fetching accounts from both projects...");
  const [oldUsers, newUsers] = await Promise.all([listAllUsers(oldDb), listAllUsers(newDb)]);
  const oldIdToEmail = new Map(oldUsers.map((u) => [u.id, (u.email || "").toLowerCase()]));
  const emailToNewId = new Map(newUsers.map((u) => [(u.email || "").toLowerCase(), u.id]));

  function remapUserId(oldUserId) {
    if (!oldUserId) return null; // ghost member — nothing to remap
    const email = oldIdToEmail.get(oldUserId);
    must(email, `Old account ${oldUserId} has no email on record — can't remap it.`);
    const newId = emailToNewId.get(email);
    must(newId, `No account with email ${email} exists yet on the NEW project. Have that person sign up there first, then re-run this script.`);
    return newId;
  }

  console.log("Fetching groups, members, expenses from the old project...");
  const [{ data: groups, error: gErr }, { data: members, error: mErr }, { data: expenses, error: eErr }] = await Promise.all([
    oldDb.from("groups").select("*"),
    oldDb.from("group_members").select("*"),
    oldDb.from("expenses").select("*"),
  ]);
  if (gErr || mErr || eErr) throw gErr || mErr || eErr;

  console.log(`Found ${groups.length} group(s), ${members.length} member(s), ${expenses.length} expense(s).`);

  console.log("Ensuring profiles exist on the new project for every remapped account...");
  // profiles rows are auto-created by the handle_new_user trigger on signup,
  // so nothing to do here beyond what remapUserId() already validated.

  console.log("Writing groups...");
  for (const g of groups) {
    const row = { ...g, created_by: remapUserId(g.created_by) };
    const { error } = await newDb.from("groups").upsert(row);
    if (error) throw new Error(`groups ${g.id}: ${error.message}`);
  }

  console.log("Writing group_members...");
  for (const m of members) {
    const row = { ...m, user_id: remapUserId(m.user_id) };
    const { error } = await newDb.from("group_members").upsert(row);
    if (error) throw new Error(`group_members ${m.id}: ${error.message}`);
  }

  console.log("Writing expenses...");
  for (const e of expenses) {
    const row = { ...e, created_by: remapUserId(e.created_by) };
    const { error } = await newDb.from("expenses").upsert(row);
    if (error) throw new Error(`expenses ${e.id}: ${error.message}`);
  }

  console.log("\nDone. Invite links were NOT copied — generate fresh ones on the new project for anyone still unclaimed.");
  console.log("Receipt photos were NOT copied (storage, not a table) — re-upload any you need via the expense editor.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
