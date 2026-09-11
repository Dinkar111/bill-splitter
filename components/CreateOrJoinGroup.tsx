"use client";

import { useState, useTransition, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { createGroup, joinGroupByCode } from "@/lib/actions";

export function CreateOrJoinGroup() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("NPR");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: SubmitEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try {
        const groupId =
          mode === "create" ? (name.trim() ? await createGroup(name.trim(), currency) : null) : code.trim() ? await joinGroupByCode(code.trim()) : null;
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
          </>
        ) : (
          <label className="field">
            <span className="lb">Invite code</span>
            <input type="text" placeholder="Paste the code or link's last part" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
          </label>
        )}
        <button className="btn primary block" type="submit" disabled={pending}>
          {mode === "create" ? "Create group" : "Join group"}
        </button>
        {err && <div className="banner bad" style={{ margin: "12px 0 0" }}>{err}</div>}
      </form>
    </div>
  );
}
