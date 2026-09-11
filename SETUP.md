# SplitTab (Next.js) — setup

Real accounts, multiple groups, invite links — self-hosted per deployer. Each
person who wants their own SplitTab deploys this same codebase with their
**own Supabase project**. Accounts and groups live inside that one deployment;
nobody else's deployment can see your data.

The bill-splitting math (`lib/calc.ts`) is a pure, independently-tested module —
see `npx tsx lib/calc.test.ts`.

---

## 1. Create the database (Supabase, free tier)

1. <https://supabase.com> → **New project**. Name it, set a database password,
   pick the nearest region. Wait ~2 min.
2. **SQL Editor → New query** → paste all of `schema.sql` → **Run**.
   This creates the tables, RLS policies, the `is_group_member`/`redeem_invite`
   functions, and a private `receipts` storage bucket.
3. **Project Settings → API Keys** — you'll need:
   - **Project URL** — `https://xxxxxxxx.supabase.co`
   - **Publishable key** — `sb_publishable_…` (or the legacy `anon` `public` key)

---

## 2. Turn on sign-in

Sign-in is **email magic link only** — no Google, no password. Type your
email, get a link, click it. Works immediately, nothing to configure: Supabase
sends the email itself on its shared sending domain (fine for personal use;
if you ever want your own sending domain, Authentication → Settings → SMTP).

**Required:** **Authentication → URL Configuration**:
- **Site URL**: your deployed URL (e.g. `https://splittab.vercel.app`)
- **Redirect URLs**: add `https://splittab.vercel.app/auth/callback` and, for
  local development, `http://localhost:3000/auth/callback`

Without these, sign-in redirects can be rejected or bounce to the wrong place.

---

## 3. Configure the app

```bash
cp .env.local.example .env.local
```

Fill in the two values from step 1:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxx
```

Run locally:

```bash
npm install
npm run dev
```

---

## 4. Deploy (Vercel)

1. Push this folder to a GitHub repo.
2. <https://vercel.com/new> → import the repo.
3. Add the same two env vars under **Project Settings → Environment Variables**.
4. Deploy. Update the Supabase **Site URL** / **Redirect URLs** (step 2) to
   match the real Vercel URL once you have it.

To update later: push to the repo — Vercel redeploys automatically.

---

## First run

1. Sign in with the magic link emailed to you.
2. **New group** — name it, pick a currency.
3. **Members → + Invite link** → send it to your friends. They sign in and
   land in the group automatically. You can also **add a member without an
   account** (a "ghost" member) and let them claim that spot later via an
   invite — useful for someone who doesn't want to sign up yet but still
   needs their share tracked.
4. **+** (centre button) → build a bill: items with equal/custom split,
   proportional discount, VAT/service charge presets with a before/after-
   discount basis, multiple payers. Save → see the receipt breakdown, your
   summary, and the minimum-transfer settlement.

## Notes

- **Ghost members**: a member added without an account has `user_id = null`
  in `group_members`. Redeeming an invite claims the oldest such row instead
  of creating a duplicate, so their history carries over.
- **Receipts** live in a private Storage bucket, scoped per group folder;
  the app generates a short-lived signed URL to display one, so nothing is
  publicly reachable by guessing a filename.
- **RLS**: every table's access is gated by group membership
  (`is_group_member` / `is_group_owner` in `schema.sql`). A non-member's
  queries come back empty, never an error.
- **Free tier** pauses a project after 7 days of zero activity — opening the
  app wakes it (or resume it manually in the dashboard).
