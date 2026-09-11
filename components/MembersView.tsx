"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { computeExpense } from "@/lib/calc";
import { currencySymbol, money } from "@/lib/format";
import { addUnclaimedMember, createInvite, removeMember, revokeInvite } from "@/lib/actions";
import type { Expense, GroupInvite, GroupMember } from "@/lib/types";

export function MembersView({
  groupId,
  members,
  expenses,
  isOwner,
  invites,
}: {
  groupId: string;
  members: GroupMember[];
  expenses: Expense[];
  isOwner: boolean;
  invites: GroupInvite[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const currency = expenses[0]?.currency || "NPR";

  const stats = members.map((m) => {
    let paid = 0;
    let owed = 0;
    let count = 0;
    for (const e of expenses) {
      if (!e.data.participants.includes(m.id)) continue;
      count++;
      const pr = computeExpense({ data: e.data }).per[m.id];
      paid += pr.paid;
      owed += pr.final;
    }
    return { member: m, paid, owed, count, balance: paid - owed };
  });

  function copyInvite(code: string) {
    const url = `${window.location.origin}/invite/${code}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  function makeInvite() {
    startTransition(async () => {
      const code = await createInvite(groupId);
      copyInvite(code);
      router.refresh();
    });
  }

  return (
    <>
      <h2 style={{ fontFamily: "var(--f-display)", fontSize: 21, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
        Members
        <button className="btn primary sm" style={{ marginLeft: "auto" }} disabled={pending} onClick={makeInvite}>
          + Invite link
        </button>
      </h2>

      {invites.length > 0 && (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ margin: "0 0 8px" }}>
            Active invites
          </div>
          {invites.map((inv) => (
            <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <code className="mono" style={{ flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                /invite/{inv.code}
              </code>
              <button className="btn sm" onClick={() => copyInvite(inv.code)}>
                {copiedCode === inv.code ? "Copied!" : "Copy"}
              </button>
              {isOwner && (
                <button
                  className="btn sm danger"
                  disabled={pending}
                  onClick={() => startTransition(async () => { await revokeInvite(groupId, inv.id); router.refresh(); })}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        {stats.map(({ member, paid, owed, count, balance }, i) => (
          <div key={member.id} className="li" style={{ borderTop: i ? "1px solid var(--line)" : "none", cursor: "default" }}>
            <Avatar id={member.id} name={member.display_name} />
            <span className="grow">
              <span className="nm">
                {member.display_name}
                {!member.user_id && (
                  <span className="tag partial" style={{ marginLeft: 6 }}>
                    unclaimed
                  </span>
                )}
              </span>
              <br />
              <span className="sub">
                {count} expense{count === 1 ? "" : "s"} · paid {currencySymbol(currency)} {money(paid)} · share {currencySymbol(currency)} {money(owed)}
              </span>
            </span>
            <span className="amt" style={{ color: `var(--${balance >= 0 ? "receive" : "owe"})` }}>
              {balance >= 0 ? "+" : "−"}
              {money(Math.abs(balance))}
            </span>
            {isOwner && (
              <button
                className="btn sm danger"
                style={{ marginLeft: 8 }}
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Remove ${member.display_name} from the group?`)) return;
                  startTransition(async () => { await removeMember(groupId, member.id); router.refresh(); });
                }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        Balance is across every expense: <b style={{ color: "var(--receive)" }}>+</b> the group owes them, <b style={{ color: "var(--owe)" }}>−</b> they owe the
        group.
      </p>

      <div className="eyebrow">Add a member without an account</div>
      <div className="card pad" style={{ display: "flex", gap: 8 }}>
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        <button
          className="btn primary"
          disabled={pending || !name.trim()}
          onClick={() => {
            const n = name.trim();
            startTransition(async () => {
              await addUnclaimedMember(groupId, n);
              setName("");
              router.refresh();
            });
          }}
        >
          Add
        </button>
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        They can be added to expenses right away. Send them an invite link later to claim their spot and sign in themselves.
      </p>
    </>
  );
}
