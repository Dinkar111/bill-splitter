import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Handles the signup-confirmation email link (only reached if "Confirm
// email" is left on in Supabase) — lands here with a `code` param to
// exchange for a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/groups";

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
