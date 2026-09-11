/**
 * Pure bill-splitting calculation engine — no UI, no I/O.
 *
 * Ported from the static SplitTab app (SplitTab/index.html), where these
 * exact functions were validated against the spec's worked example and
 * against awkward rounding cases (see calc.test.ts). The only change here is
 * TypeScript types; the arithmetic is unchanged.
 *
 * Everything internal is integer minor units ("paisa" — cents, whatever the
 * currency's smallest unit is) so proportional splits can be made to add up
 * EXACTLY via largest-remainder rounding. `sum(final shares) === grandTotal`
 * always holds — see `reconciled` on the result.
 */

export type SplitMode = "equal" | "custom";
export type ChargeMode = "percent" | "fixed";
export type ChargeBasis = "before" | "after";
export type ChargeKind = "vat" | "service" | "tip" | "other";
export type DiscountMode = "none" | "percent" | "fixed";

export interface ExpenseItem {
  id: string;
  name: string;
  kind?: "food" | "drink" | "dessert" | "other";
  qty?: number;
  unitPrice?: number;
  /** Item total in major currency units, e.g. 1200.00 */
  total: number;
  mode: SplitMode;
  /** Person ids who consumed this item */
  people: string[];
  /** Custom mode only: personId -> major-unit amount, must sum to `total` */
  custom?: Record<string, number>;
}

export interface ExpenseCharge {
  id: string;
  name: string;
  kind: ChargeKind;
  mode: ChargeMode;
  /** Percent (e.g. 13) or fixed major-unit amount, depending on `mode` */
  value: number;
  basis: ChargeBasis;
}

export interface ExpenseDiscount {
  mode: DiscountMode;
  value: number;
}

export interface ExpensePayment {
  id: string;
  personId: string;
  /** Major currency units */
  amount: number;
}

export interface ExpenseData {
  participants: string[];
  items: ExpenseItem[];
  discount: ExpenseDiscount;
  charges: ExpenseCharge[];
  payments: ExpensePayment[];
  settledPairs?: string[];
  forceSettled?: boolean;
}

export interface ExpenseLike {
  currency?: string;
  data: ExpenseData;
}

export interface PersonResult {
  personId: string;
  itemLines: { name: string; amount: number }[];
  itemSubtotal: number;
  discount: number;
  discountedSubtotal: number;
  charges: { name: string; amount: number }[];
  chargeTotal: number;
  final: number;
  paid: number;
  balance: number;
}

export interface ChargeResult {
  charge: ExpenseCharge;
  total: number;
  shares: Record<string, number>;
}

export interface SettlementLeg {
  from: string;
  to: string;
  /** Paisa (integer minor units) */
  amount: number;
}

export interface ComputeResult {
  parts: string[];
  per: Record<string, PersonResult>;
  itemShares: { item: ExpenseItem; shares: Record<string, number> }[];
  totals: {
    subtotal: number;
    discountTotal: number;
    discountedSubtotal: number;
    chargesTotal: number;
    grandTotal: number;
    totalPaid: number;
  };
  chargeResults: ChargeResult[];
  settlement: SettlementLeg[];
  reconciled: boolean;
  paymentGap: number;
}

export const CHARGE_LABEL: Record<ChargeKind, string> = {
  vat: "VAT",
  service: "Service charge",
  tip: "Tip",
  other: "Charge",
};

/** Major units -> integer minor units (paisa/cents). */
export function toMinor(n: number | undefined | null): number {
  return Math.round((Number(n) || 0) * 100);
}

/**
 * Largest-remainder proportional split. Returns a map of id -> minor units
 * that sums EXACTLY to `total`, however uneven the weights are.
 */
export function distribute(total: number, weightMap: Record<string, number>): Record<string, number> {
  const ids = Object.keys(weightMap);
  const out: Record<string, number> = {};
  if (!ids.length) return out;
  const w = ids.map((id) => Math.max(0, weightMap[id] || 0));
  const W = w.reduce((a, b) => a + b, 0);
  if (total === 0) {
    ids.forEach((id) => (out[id] = 0));
    return out;
  }
  if (W <= 0) {
    const base = Math.trunc(total / ids.length);
    const rem = total - base * ids.length;
    ids.forEach((id, i) => (out[id] = base + (i < Math.abs(rem) ? Math.sign(rem) : 0)));
    return out;
  }
  const fr: [string, number][] = [];
  let assigned = 0;
  ids.forEach((id, i) => {
    const exact = (total * w[i]) / W;
    const fl = Math.floor(exact);
    out[id] = fl;
    assigned += fl;
    fr.push([id, exact - fl]);
  });
  const rem = total - assigned;
  fr.sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < Math.abs(rem); i++) out[fr[i % fr.length][0]] += Math.sign(rem);
  return out;
}

/** Greedy minimum-transaction settlement: biggest debtor pays biggest creditor. */
export function minimizeSettlement(entries: { id: string; bal: number }[]): SettlementLeg[] {
  const cred = entries
    .filter((e) => e.bal > 0)
    .map((e) => ({ id: e.id, amt: e.bal }))
    .sort((a, b) => b.amt - a.amt);
  const debt = entries
    .filter((e) => e.bal < 0)
    .map((e) => ({ id: e.id, amt: -e.bal }))
    .sort((a, b) => b.amt - a.amt);
  const out: SettlementLeg[] = [];
  let i = 0;
  let j = 0;
  while (i < debt.length && j < cred.length) {
    const pay = Math.min(debt[i].amt, cred[j].amt);
    if (pay > 0) out.push({ from: debt[i].id, to: cred[j].id, amount: pay });
    debt[i].amt -= pay;
    cred[j].amt -= pay;
    if (debt[i].amt <= 0) i++;
    if (cred[j].amt <= 0) j++;
  }
  return out;
}

export function computeExpense(exp: ExpenseLike): ComputeResult {
  const d = exp?.data || ({} as ExpenseData);
  const parts = (d.participants || []).slice();
  const items = d.items || [];

  // Step 1 — per-person item subtotal
  const itemSub: Record<string, number> = {};
  parts.forEach((p) => (itemSub[p] = 0));
  const itemShares: { item: ExpenseItem; shares: Record<string, number> }[] = [];
  for (const it of items) {
    const tot = toMinor(it.total);
    const ppl = (it.people || []).filter((p) => parts.includes(p));
    let shares: Record<string, number> = {};
    if (it.mode === "custom") {
      ppl.forEach((p) => (shares[p] = toMinor((it.custom || {})[p] || 0)));
      const diff = tot - Object.values(shares).reduce((a, b) => a + b, 0);
      if (diff !== 0 && ppl.length) {
        const big = ppl.slice().sort((a, b) => (shares[b] || 0) - (shares[a] || 0))[0];
        shares[big] += diff;
      }
    } else {
      const w: Record<string, number> = {};
      ppl.forEach((p) => (w[p] = 1));
      shares = distribute(tot, w);
    }
    itemShares.push({ item: it, shares });
    for (const p in shares) itemSub[p] = (itemSub[p] || 0) + shares[p];
  }
  const subtotal = Object.values(itemSub).reduce((a, b) => a + b, 0);

  // Step 2 — discount total
  const disc = d.discount || { mode: "none", value: 0 };
  let discountTotal = 0;
  if (disc.mode === "percent") discountTotal = Math.round((subtotal * (Number(disc.value) || 0)) / 100);
  else if (disc.mode === "fixed") discountTotal = toMinor(disc.value);
  discountTotal = Math.max(0, Math.min(discountTotal, subtotal));

  // Step 3 — distribute discount proportionally to item subtotal
  const discShare = distribute(discountTotal, itemSub);

  // Step 4 — discounted subtotal per person
  const discSub: Record<string, number> = {};
  parts.forEach((p) => (discSub[p] = (itemSub[p] || 0) - (discShare[p] || 0)));
  const discountedSubtotal = subtotal - discountTotal;

  // Steps 5-7 — charges, distributed on the chosen basis
  const charges = d.charges || [];
  const chargeResults: ChargeResult[] = charges.map((c) => {
    const beforeBasis = c.basis === "before";
    const base = beforeBasis ? subtotal : discountedSubtotal;
    const weights = beforeBasis ? itemSub : discSub;
    let total = c.mode === "percent" ? Math.round((base * (Number(c.value) || 0)) / 100) : toMinor(c.value);
    total = Math.max(0, total);
    return { charge: c, total, shares: distribute(total, weights) };
  });
  const chargesTotal = chargeResults.reduce((a, r) => a + r.total, 0);

  // Step 8 — final share per person
  const per: Record<string, PersonResult> = {};
  parts.forEach((p) => {
    const chg = chargeResults.map((r) => ({
      name: r.charge.name || CHARGE_LABEL[r.charge.kind] || "Charge",
      amount: r.shares[p] || 0,
    }));
    const chgTot = chg.reduce((a, x) => a + x.amount, 0);
    per[p] = {
      personId: p,
      itemLines: itemShares
        .filter((s) => s.shares[p] != null)
        .map((s) => ({ name: s.item.name || "Item", amount: s.shares[p] })),
      itemSubtotal: itemSub[p] || 0,
      discount: discShare[p] || 0,
      discountedSubtotal: discSub[p] || 0,
      charges: chg,
      chargeTotal: chgTot,
      final: (itemSub[p] || 0) - (discShare[p] || 0) + chgTot,
      paid: 0,
      balance: 0,
    };
  });
  const grandTotal = subtotal - discountTotal + chargesTotal;

  // Step 9 — payments
  let totalPaid = 0;
  (d.payments || []).forEach((pay) => {
    const amt = toMinor(pay.amount);
    totalPaid += amt;
    if (per[pay.personId]) per[pay.personId].paid += amt;
  });
  parts.forEach((p) => (per[p].balance = per[p].paid - per[p].final));

  // Step 10 — settlement
  const settlement = minimizeSettlement(parts.map((p) => ({ id: p, bal: per[p].balance })));

  return {
    parts,
    per,
    itemShares,
    totals: { subtotal, discountTotal, discountedSubtotal, chargesTotal, grandTotal, totalPaid },
    chargeResults,
    settlement,
    reconciled: Object.values(per).reduce((a, x) => a + x.final, 0) === grandTotal,
    paymentGap: totalPaid - grandTotal,
  };
}
