"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExpenseEditor } from "@/components/expense-editor/ExpenseEditor";
import type { Group, GroupMember } from "@/lib/types";

export function GroupChrome({ group, members, children }: { group: Group; members: GroupMember[]; children: ReactNode }) {
  const [newExpenseOpen, setNewExpenseOpen] = useState(false);

  return (
    <div className="app-shell">
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--paper)",
          padding: "16px 18px 12px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Link href={`/g/${group.id}`}>
          <div style={{ fontFamily: "var(--f-display)", fontSize: 22, letterSpacing: 1 }}>{group.name}</div>
          <div className="muted" style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            SplitTab
          </div>
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/groups" className="icon-btn" style={{ display: "grid", placeItems: "center", textDecoration: "none" }} aria-label="Switch group">
            ⇄
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main style={{ padding: "16px 14px 0" }}>{children}</main>

      {members.length > 0 && (
        <button className="fab" onClick={() => setNewExpenseOpen(true)} aria-label="Add expense">
          +
        </button>
      )}
      <BottomNav groupId={group.id} />

      {newExpenseOpen && (
        <ExpenseEditor groupId={group.id} defaultCurrency={group.currency_default} members={members} onClose={() => setNewExpenseOpen(false)} />
      )}
    </div>
  );
}
