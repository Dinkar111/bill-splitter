import { computeExpense } from "@/lib/calc";
import type { Expense } from "@/lib/types";

export type ExpenseStatus = "settled" | "partial" | "unsettled";

export function statusOf(exp: Pick<Expense, "data">): ExpenseStatus {
  if (exp.data.forceSettled) return "settled";
  const r = computeExpense({ data: exp.data });
  if (!r.settlement.length) return "settled";
  const done = (exp.data.settledPairs || []).length;
  if (done >= r.settlement.length) return "settled";
  return done > 0 ? "partial" : "unsettled";
}
