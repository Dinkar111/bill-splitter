"use client";

import { useState, useTransition, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { createGroup, joinGroupByCode, type ExtraMember } from "@/lib/actions";
import { Spinner } from "@/components/Spinner";
import { Avatar } from "@/components/Avatar";
import type { KnownPerson } from "@/lib/data";

export function CreateOrJoinGroup({ knownPeople }: { knownPeople: KnownPerson[] }) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("NPR");
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try {
        let groupId: string | null = null;
        if (mode === "create") {
          if (name.trim()) {
            const extraMembers: ExtraMember[] = knownPeople
              .filter((p) => selected.has(p.key))
              .map((p) => ({ userId: p.userId, displayName: p.displayName }));
            groupId = await createGroup(name.trim(), currency, extraMembers);
          }
        } else if (code.trim()) {
          groupId = await joinGroupByCode(code.trim());
        }
        if (groupId) router.push(`/g/${groupId}`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="card pad">
      <div className="seg" style={{ marginBottom: 14 }}>
        <button type="button" className={mode === "create" ? "on" : ""} onClick={() => setMode("create")}>
          New group
        </button>
        <button type="button" className={mode === "join" ? "on" : ""} onClick={() => setMode("join")}>
          Join by code
        </button>
      </div>
      <form onSubmit={submit}>
        {mode === "create" ? (
          <>
            <label className="field">
              <span className="lb">Group name</span>
              <input type="text" placeholder="Dinner friends" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </label>
            <label className="field">
              <span className="lb">Default currency</span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {["NPR", "INR", "USD", "EUR", "GBP", "AUD", "JPY"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            {knownPeople.length > 0 && (
              <div className="field">
                <span className="lb">
                  Add people you already know <span className="muted">(optional)</span>
                </span>
                <div className="chips">
                  {knownPeople.map((p) => (
                    <button key={p.key} type="button" className={`chip ${selected.has(p.key) ? "on" : ""}`} onClick={() => toggle(p.key)}>
                      <Avatar id={p.key} name={p.displayName} size="sm" /> {p.displayName}
                    </button>
                  ))}
                </div>
                {selected.size > 0 && (
                  <p className="muted" style={{ marginTop: 6 }}>
                    Anyone with an account is added straight in — no invite needed since you already share a group with them. Unclaimed names come along as
                    unclaimed here too.
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <label className="field">
            <span className="lb">Invite code</span>
            <input type="text" placeholder="Paste the code or link's last part" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
          </label>
        )}
        <button className="btn primary block" type="submit" disabled={pending}>
          {pending ? <Spinner size={16} /> : mode === "create" ? "Create group" : "Join group"}
        </button>
        {err && <div className="banner bad" style={{ margin: "12px 0 0" }}>{err}</div>}
      </form>
    </div>
  );
}
