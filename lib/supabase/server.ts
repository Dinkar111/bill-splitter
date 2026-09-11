import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import type { Database } from "@/lib/database.types";

/**
 * A Supabase client for Server Components / Server Actions / Route Handlers.
 * Reads the session from cookies; writes are best-effort (a Server Component
 * can't set cookies — the middleware is what actually keeps the session
 * fresh on every request).
 *
 * Memoized per request with `cache()`: a layout and the page inside it both
 * need a client, and sharing ONE instance (same cookie store either way)
 * lets the data-fetcher cache below actually dedupe — `cache()` matches
 * calls by argument identity, so two pages each creating their own client
 * would never be seen as "the same call" even with identical groupId args.
 */
export const supabaseServer = cache(async () => {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component with no request/response to write
          // to — fine, middleware.ts refreshes the session on the next request.
        }
      },
    },
  });
});

/**
 * The authenticated user, memoized per request with React's `cache()`.
 *
 * `auth.getUser()` always makes a real network round-trip to Supabase to
 * revalidate the token (that's why it's used over `getSession()` here) — so
 * without this, a single page load was paying for it 2-3x over: once in
 * proxy.ts (middleware), once in the group layout, once again in the page.
 * `cache()` collapses repeated calls within one request into a single
 * underlying call. Middleware runs before this and isn't covered by it —
 * that one network call per request is unavoidable — but this removes every
 * OTHER duplicate.
 */
export const getAuthedUser = cache(async () => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
