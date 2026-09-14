"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Spinner } from "@/components/Spinner";

// Email + password, not a magic link or emailed OTP code: Supabase's default
// (no custom SMTP) shared email service doesn't allow editing templates to
// show a code, and a clickable link is prone to mail apps pre-fetching it
// (Gmail/Outlook/iOS Mail link-safety scanning) and spending the one-time
// token before a person ever clicks it. A password sidesteps the email step
// for every sign-in after the first.
export function SignInForm({ next = "/groups" }: { next?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const router = useRouter();

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.trim() || password.length < 6) return;
    if (mode === "signup" && !firstName.trim()) return;
    setBusy(true);
    const supabase = supabaseBrowser();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) {
        setErr(error.message);
        return;
      }
    } else {
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setBusy(false);
      if (error) {
        setErr(error.message);
        return;
      }
      if (!data.session) {
        // "Confirm email" is turned on in Supabase — a confirmation link was sent.
        setConfirmSent(true);
        return;
      }
    }

    router.push(next);
    router.refresh();
  }

  if (confirmSent) {
    return (
      <div className="okbox">
        Check <b>{email}</b> and click the confirmation link, then come back and sign in.
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="seg" style={{ marginBottom: 14 }}>
        <button type="button" className={mode === "signin" ? "on" : ""} onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>
          Create account
        </button>
      </div>

      {mode === "signup" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="field">
            <span className="lb">First name</span>
            <input type="text" required autoComplete="given-name" placeholder="Dinkar" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="field">
            <span className="lb">
              Last name <span className="muted">(optional)</span>
            </span>
            <input type="text" autoComplete="family-name" placeholder="Maharjan" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
        </div>
      )}

      <label className="field">
        <span className="lb">Email</span>
        <input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        <span className="lb">Password</span>
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button className="btn primary block" type="submit" disabled={busy}>
        {busy ? <Spinner size={16} /> : mode === "signin" ? "Sign in" : "Create account"}
      </button>
      {err && (
        <div className="banner bad" style={{ margin: "12px 0 0" }}>
          {err}
        </div>
      )}
    </form>
  );
}
