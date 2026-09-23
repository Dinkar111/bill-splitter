"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { centralizedSettlement, minimizeSettlement } from "@/lib/calc";
import { currencySymbol, money } from "@/lib/format";
import type { GroupMember } from "@/lib/types";

export interface CurrencyBalances {
  currency: string;
  /** member id -> minor units still owed (+) / owing (−) across every expense in this currency */
  balances: Record<string, number>;
}

/**
 * The whole group's unsettled money netted into one picture — instead of
 * reading settlement expense by expense. Read-only: paying someone back is
 * still ticked off inside the individual expenses (that's where the record of
 * what was actually paid lives); this just shows the simplest way to clear
 * everything at once.
 */
export function GroupSettlement({ blocks, members, meId }: { blocks: CurrencyBalances[]; members: GroupMember[]; meId: string | null }) {
  const [mode, setMode] = useState<"minimal" | "centralized">("minimal");

  const defaultCollector = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const b of blocks) for (const [id, v] of Object.entries(b.balances)) totals[id] = (totals[id] || 0) + v;
    return Object.keys(totals).sort((a, b) => totals[b] - totals[a])[0] || members[0]?.id || null;
  }, [blocks, members]);
  const [collectorId, setCollectorId] = useState<string | null>(null);
  const collector = collectorId ?? defaultCollector;

  const nameOf = (id: string) => (id === meId ? "You" : (members.find((m) => m.id === id)?.display_name || "(removed)").split(" ")[0]);
  const fullName = (id: string) => members.find((m) => m.id === id)?.display_name || "(removed)";

  const active = blocks.filter((b) => Object.values(b.balances).some((v) => v !== 0));

  return (
    <div className="card pad" style={{ marginTop: 12 }}>
      <div className="eyebrow" style={{ margin: "0 0 4px" }}>
        Group settlement
      </div>
      <p className="muted" style={{ marginBottom: 8 }}>
        Everything still unpaid across all expenses, netted together.
      </p>

      {active.length === 0 ? (
        <p className="muted">Everyone&apos;s settled up — nothing owed anywhere.</p>
      ) : (
        <>
          <div className="seg" style={{ marginBottom: 10 }}>
            <button type="button" className={mode === "minimal" ? "on" : ""} onClick={() => setMode("minimal")}>
              Minimize transfers
            </button>
            <button type="button" className={mode === "centralized" ? "on" : ""} onClick={() => setMode("centralized")}>
              Centralized
            </button>
          </div>

          {mode === "centralized" && (
            <>
              <p className="muted" style={{ marginBottom: 6 }}>
                Everyone pays <b>{collector ? fullName(collector) : "—"}</b>, who then pays out anyone still owed.
              </p>
              <div className="chips" style={{ marginBottom: 10 }}>
                {members.map((m) => (
                  <button key={m.id} type="button" className={`chip ${collector === m.id ? "on" : ""}`} onClick={() => setCollectorId(m.id)}>
                    <Avatar id={m.id} name={m.display_name} size="sm" /> {m.display_name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </>
          )}

          {active.map((block) => {
            const entries = members.map((m) => ({ id: m.id, bal: block.balances[m.id] || 0 }));
            const positions = entries.filter((e) => e.bal !== 0).sort((a, b) => b.bal - a.bal);
            const transfers = mode === "centralized" && collector ? centralizedSettlement(entries, collector) : minimizeSettlement(entries);
            const sym = currencySymbol(block.currency);

            return (
              <div key={block.currency} style={{ marginTop: active.length > 1 ? 14 : 4 }}>
                {active.length > 1 && (
                  <div className="eyebrow" style={{ margin: "0 0 6px" }}>
                    {block.currency}
                  </div>
                )}

                <div className="muted" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, margin: "6px 0 2px" }}>
                  Net position
                </div>
                {positions.map((p) => (
                  <div className="settle-row" key={p.id}>
                    <Avatar id={p.id} name={fullName(p.id)} size="sm" />
                    <span className="flow">
                      {nameOf(p.id)} <span className="muted">{p.bal > 0 ? "is owed" : "owes"}</span>
                    </span>
                    <span className="amt" style={{ color: `var(--${p.bal > 0 ? "receive" : "owe"})` }}>
                      {sym} {money(Math.abs(p.bal))}
                    </span>
                  </div>
                ))}

                <div className="muted" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, margin: "12px 0 2px" }}>
                  Who pays whom
                </div>
                {transfers.length === 0 ? (
                  <p className="muted">Nothing to transfer.</p>
                ) : (
                  transfers.map((t, i) => (
                    <div className="settle-row" key={i}>
                      <Avatar id={t.from} name={fullName(t.from)} size="sm" />
                      <span className="flow" style={{ fontWeight: t.from === meId || t.to === meId ? 700 : 500 }}>
                        {nameOf(t.from)} <span className="muted">→</span> <span className="to">{nameOf(t.to)}</span>
                      </span>
                      <span className="amt">
                        {sym} {money(t.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            );
          })}

          <p className="muted" style={{ marginTop: 10 }}>
            This is a summary — tick payments off inside each expense as they happen, and this updates on its own.
          </p>
        </>
      )}
    </div>
  );
}
