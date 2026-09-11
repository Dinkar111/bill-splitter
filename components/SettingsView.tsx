"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ThemeSegmented } from "@/components/ThemeSegmented";
import { deleteGroup, leaveGroup, renameGroup, renameMember, signOut } from "@/lib/actions";
import type { Group, GroupMember } from "@/lib/types";

const CURRENCIES = ["NPR", "INR", "USD", "EUR", "GBP", "AUD", "JPY"];

export function SettingsView({ group, membership }: { group: Group; membership: GroupMember }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [myName, setMyName] = useState(membership.display_name);
  const [groupName, setGroupName] = useState(group.name);
  const [currency, setCurrency] = useState(group.currency_default);
  const isOwner = membership.role === "owner";

  return (
    <>
      <h2 style={{ fontFamily: "var(--f-display)", fontSize: 21, marginBottom: 12 }}>Settings</h2>

      <div className="card pad">
        <div className="eyebrow" style={{ margin: "0 0 8px" }}>
          Your name in this group
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" value={myName} onChange={(e) => setMyName(e.target.value)} autoComplete="off" />
          <button
            className="btn primary"
            disabled={pending || !myName.trim() || myName.trim() === membership.display_name}
            onClick={() => startTransition(async () => { await renameMember(group.id, membership.id, myName.trim()); router.refresh(); })}
          >
            Save
          </button>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 12 }}>
        <div className="eyebrow" style={{ margin: "0 0 8px" }}>
          Appearance
        </div>
        <ThemeSegmented />
      </div>

      {isOwner && (
        <div className="card pad" style={{ marginTop: 12 }}>
          <div className="eyebrow" style={{ margin: "0 0 8px" }}>
            Group settings
          </div>
          <label className="field">
            <span className="lb">Group name</span>
            <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} autoComplete="off" />
          </label>
          <label className="field">
            <span className="lb">Default currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button
            className="btn primary"
            disabled={pending || !groupName.trim()}
            onClick={() => startTransition(async () => { await renameGroup(group.id, groupName.trim(), currency); router.refresh(); })}
          >
            Save
          </button>
          <button
            className="btn danger block"
            style={{ marginTop: 16 }}
            disabled={pending}
            onClick={() => {
              if (!confirm(`Delete "${group.name}" for everyone? All its expenses go with it. This can't be undone.`)) return;
              startTransition(async () => {
                await deleteGroup(group.id);
                router.push("/groups");
              });
            }}
          >
            Delete group
          </button>
        </div>
      )}

      {!isOwner && (
        <div className="card pad" style={{ marginTop: 12 }}>
          <button
            className="btn danger block"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Leave "${group.name}"?`)) return;
              startTransition(async () => {
                await leaveGroup(group.id);
                router.push("/groups");
              });
            }}
          >
            Leave group
          </button>
        </div>
      )}

      <form action={signOut} style={{ marginTop: 12 }}>
        <button className="btn block" type="submit">
          Sign out
        </button>
      </form>

      <p className="muted" style={{ textAlign: "center", marginTop: 20 }}>
        SplitTab · fair bills, fast
      </p>
    </>
  );
}
