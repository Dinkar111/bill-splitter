import { redirect } from "next/navigation";
import { getAuthedUser, supabaseServer } from "@/lib/supabase/server";
import { SignInForm } from "@/components/SignInForm";

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getAuthedUser();

  if (!user) {
    return (
      <div className="narrow-shell">
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>You&apos;ve been invited</h1>
        <p className="muted" style={{ marginBottom: 18 }}>Sign in to join the group.</p>
        <SignInForm next={`/invite/${code}`} />
      </div>
    );
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("redeem_invite", { p_code: code });
  if (error) {
    return (
      <div className="narrow-shell">
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Couldn&apos;t join</h1>
        <div className="banner bad">{error.message}</div>
      </div>
    );
  }

  redirect(`/g/${data}`);
}
