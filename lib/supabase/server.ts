import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import type { Database } from "@/lib/database.types";

/**
 * A Supabase client for Server Components / Server Actions / Route Handlers.
 * Reads the session from cookies; writes are best-effort (a Server Component
 * can't set cookies — the middleware is what actually keeps the session
 * fresh on every request).
 */
export async function supabaseServer() {
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
}
