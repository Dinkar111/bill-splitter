"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import type { Database } from "@/lib/database.types";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** One shared Supabase client for the browser. Safe to call anywhere in a Client Component. */
export function supabaseBrowser() {
  if (cached) return cached;
  const { url, anonKey } = supabaseEnv();
  cached = createBrowserClient<Database>(url, anonKey);
  return cached;
}
