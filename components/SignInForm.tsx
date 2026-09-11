"use client";

import { useState, type SubmitEvent } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SignInForm({ next = "/groups" }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function withGoogle() {
    setErr(null);
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback() },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
    }
    // on success the browser navigates away to Google, so no need to reset busy
  }

  async function withMagicLink(e: SubmitEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) return;
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback() },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="okbox">
        Check <b>{email}</b> for a sign-in link. You can close this tab.
      </div>
    );
  }

  return (
    <div>
      <button className="btn primary block" onClick={withGoogle} disabled={busy}>
        Continue with Google
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0", color: "var(--ink-soft)", fontSize: 12.5 }}>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        or
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>
      <form onSubmit={withMagicLink}>
        <label className="field">
          <span className="lb">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="btn block" type="submit" disabled={busy}>
          Email me a sign-in link
        </button>
      </form>
      {err && <div className="banner bad" style={{ margin: "12px 0 0" }}>{err}</div>}
    </div>
  );
}
