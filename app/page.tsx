import { redirect } from "next/navigation";
import { EnvSetupNotice } from "@/components/EnvSetupNotice";
import { SignInForm } from "@/components/SignInForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabaseEnv } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export default async function HomePage() {
  try {
    supabaseEnv();
  } catch {
    return <EnvSetupNotice />;
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/groups");

  return (
    <div className="narrow-shell">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "var(--f-display)", fontSize: 30, letterSpacing: 1 }}>
            SPLIT<span style={{ color: "var(--accent)" }}>TAB</span>
          </div>
          <p className="muted">Split group bills by what each person actually ordered.</p>
        </div>
        <ThemeToggle />
      </div>
      <SignInForm />
    </div>
  );
}
