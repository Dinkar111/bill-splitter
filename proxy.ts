import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

// Keeps the Supabase auth session cookie fresh on every request — without
// this, sessions silently expire client-side even though the refresh token
// is still valid. See https://supabase.com/docs/guides/auth/server-side/nextjs
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  let env;
  try {
    env = supabaseEnv();
  } catch {
    // Env vars not configured yet — let the page render and show the setup notice.
    return response;
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
