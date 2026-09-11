import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { CreateOrJoinGroup } from "@/components/CreateOrJoinGroup";
import { ThemeToggle } from "@/components/ThemeToggle";
import { signOut } from "@/lib/actions";

export default async function GroupsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Two plain queries rather than an embedded/joined select — simpler to keep
  // correctly typed against the hand-written Database type (no generated
  // relationship metadata to lean on).
  const { data: memberships } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
  const groupIds = (memberships || []).map((m) => m.group_id);
  const { data: groupRows } = groupIds.length
    ? await supabase.from("groups").select("id, name, currency_default").in("id", groupIds)
    : { data: [] };
  const groups = groupRows || [];

  return (
    <div className="app-shell" style={{ padding: "18px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{ fontFamily: "var(--f-display)", fontSize: 26, letterSpacing: 1 }}>
          SPLIT<span style={{ color: "var(--accent)" }}>TAB</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ThemeToggle />
          <form action={signOut}>
            <button className="btn sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <h2 className="eyebrow" style={{ margin: "0 0 8px" }}>
        Your groups
      </h2>
      {groups.length === 0 ? (
        <div className="empty" style={{ padding: "20px 0" }}>
          <p>No groups yet — create one or join with an invite code below.</p>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 18 }}>
          {groups.map((g, i) => (
            <Link
              key={g.id}
              href={`/g/${g.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderTop: i ? "1px solid var(--line)" : "none",
              }}
            >
              <span style={{ fontWeight: 700 }}>{g.name}</span>
              <span className="muted">{g.currency_default}</span>
            </Link>
          ))}
        </div>
      )}

      <CreateOrJoinGroup />
    </div>
  );
}
