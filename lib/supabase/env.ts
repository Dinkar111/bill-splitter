/**
 * Bring-your-own-Supabase: every deployer sets these two env vars to their
 * own project (see SETUP.md). The anon/publishable key is meant to be
 * public — every table it can touch is guarded by the RLS policies in
 * schema.sql, never by keeping this key secret.
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.local.example to .env.local and fill in your Supabase project's values (see SETUP.md)."
    );
  }
  return { url, anonKey };
}
