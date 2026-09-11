export function EnvSetupNotice() {
  return (
    <div className="narrow-shell">
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Connect SplitTab</h1>
      <p className="muted" style={{ marginBottom: 14 }}>
        This deployment doesn&apos;t have a Supabase project configured yet.
      </p>
      <ol style={{ margin: "0 0 16px 18px", fontSize: 13, color: "var(--ink-soft)" }}>
        <li style={{ marginBottom: 6 }}>
          Create a project at <code>supabase.com</code> (free tier).
        </li>
        <li style={{ marginBottom: 6 }}>
          In <b>SQL Editor</b>, run <code>schema.sql</code> from this repo.
        </li>
        <li style={{ marginBottom: 6 }}>
          Copy <code>.env.local.example</code> to <code>.env.local</code> and fill in your{" "}
          <b>Project URL</b> and <b>anon/publishable key</b> (Project Settings → API Keys).
        </li>
        <li style={{ marginBottom: 6 }}>
          On Vercel, add the same two variables under Project Settings → Environment Variables, then redeploy.
        </li>
      </ol>
      <p className="muted">Full walkthrough, including Google sign-in setup, is in SETUP.md.</p>
    </div>
  );
}
