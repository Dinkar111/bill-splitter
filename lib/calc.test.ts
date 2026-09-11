/**
 * Re-runs the exact cases already validated in the static SplitTab app
 * against the spec's worked example, plus awkward rounding cases.
 * Run with: npx tsx lib/calc.test.ts
 */
import assert from "node:assert/strict";
import { computeExpense, distribute, type ExpenseLike } from "./calc";

let failures = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log("ok  -", name);
  } catch (err) {
    failures++;
    console.error("FAIL -", name);
    console.error(err);
  }
}

test("spec worked example (section 7) reconciles exactly", () => {
  const exp: ExpenseLike = {
    currency: "NPR",
    data: {
      participants: ["d", "r", "s"],
      items: [
        { id: "i1", name: "Dinkar food", total: 1000, mode: "custom", people: ["d"], custom: { d: 1000 } },
        { id: "i2", name: "Rajat food", total: 2000, mode: "custom", people: ["r"], custom: { r: 2000 } },
        { id: "i3", name: "Suyoj food", total: 2000, mode: "custom", people: ["s"], custom: { s: 2000 } },
      ],
      discount: { mode: "percent", value: 20 },
      charges: [
        { id: "c1", name: "VAT", kind: "vat", mode: "percent", value: 13, basis: "after" },
        { id: "c2", name: "Service", kind: "service", mode: "percent", value: 10, basis: "after" },
      ],
      payments: [
        { id: "p1", personId: "d", amount: 3000 },
        { id: "p2", personId: "r", amount: 1920 },
      ],
    },
  };
  const r = computeExpense(exp);
  assert.equal(r.totals.subtotal, 500000);
  assert.equal(r.totals.discountTotal, 100000);
  assert.equal(r.totals.discountedSubtotal, 400000);
  assert.equal(r.totals.chargesTotal, 92000);
  assert.equal(r.totals.grandTotal, 492000);
  assert.equal(r.per.d.final, 98400);
  assert.equal(r.per.r.final, 196800);
  assert.equal(r.per.s.final, 196800);
  assert.equal(r.reconciled, true);
  const sumFinal = r.parts.reduce((a, p) => a + r.per[p].final, 0);
  assert.equal(sumFinal, r.totals.grandTotal);
});

test("odd 3-/7-way splits still reconcile to the paisa", () => {
  const exp: ExpenseLike = {
    currency: "NPR",
    data: {
      participants: ["a", "b", "c", "d", "e", "f", "g"],
      items: [
        { id: "i1", name: "Pizza", total: 1000, mode: "equal", people: ["a", "b", "c"] },
        { id: "i2", name: "Fries", total: 100, mode: "equal", people: ["a", "b", "c", "d", "e", "f", "g"] },
        { id: "i3", name: "Beer", total: 333.33, mode: "equal", people: ["d", "e"] },
      ],
      discount: { mode: "percent", value: 17 },
      charges: [
        { id: "c1", name: "VAT", kind: "vat", mode: "percent", value: 13, basis: "before" },
        { id: "c2", name: "Tip", kind: "tip", mode: "fixed", value: 55, basis: "after" },
      ],
      payments: [{ id: "p1", personId: "a", amount: 1200 }],
    },
  };
  const r = computeExpense(exp);
  const sumFinal = r.parts.reduce((a, p) => a + r.per[p].final, 0);
  assert.equal(sumFinal, r.totals.grandTotal);
  assert.equal(r.reconciled, true);
  const balSum = r.parts.reduce((a, p) => a + r.per[p].balance, 0);
  assert.equal(balSum, r.totals.totalPaid - r.totals.grandTotal);
});

test("distribute() splits remainders by largest fraction and handles edge cases", () => {
  assert.deepEqual(distribute(100, { x: 1, y: 1, z: 1 }), { x: 34, y: 33, z: 33 });
  assert.deepEqual(distribute(1, { x: 1, y: 1, z: 1 }), { x: 1, y: 0, z: 0 });
  assert.deepEqual(distribute(1000, {}), {});
  assert.deepEqual(distribute(0, { x: 1, y: 1 }), { x: 0, y: 0 });
});

test("settlement is minimal (at most people-1 transfers) and covers net balances", () => {
  const exp: ExpenseLike = {
    data: {
      participants: ["dinkar", "rajat", "suyoj", "dipson", "sashank"],
      items: [
        { id: "i1", name: "Pizza", total: 1200, mode: "equal", people: ["dinkar", "rajat", "suyoj"] },
        { id: "i2", name: "Burger", total: 500, mode: "equal", people: ["dipson"] },
        { id: "i3", name: "Fries", total: 400, mode: "equal", people: ["dinkar", "rajat", "suyoj", "dipson", "sashank"] },
        { id: "i4", name: "Coke", total: 150, mode: "equal", people: ["dinkar"] },
        { id: "i5", name: "Beer", total: 600, mode: "equal", people: ["rajat", "sashank"] },
      ],
      discount: { mode: "percent", value: 20 },
      charges: [
        { id: "c1", name: "Service charge", kind: "service", mode: "percent", value: 10, basis: "before" },
        { id: "c2", name: "VAT", kind: "vat", mode: "percent", value: 13, basis: "after" },
      ],
      payments: [{ id: "p1", personId: "dinkar", amount: 2861.4 }],
    },
  };
  const r = computeExpense(exp);
  assert.equal(r.totals.grandTotal, 286140);
  assert.equal(r.reconciled, true);
  assert.ok(r.settlement.length <= 4);
  const settledToDinkar = r.settlement.reduce((a, s) => (s.to === "dinkar" ? a + s.amount : a), 0);
  assert.equal(settledToDinkar, r.per.dinkar.balance);
});

if (failures) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
} else {
  console.log("\nAll calc engine tests passed.");
}
