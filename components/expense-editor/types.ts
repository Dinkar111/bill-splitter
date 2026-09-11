import type { ExpenseData } from "@/lib/calc";

export interface ExpenseDraft {
  id?: string;
  title: string;
  date: string;
  location: string;
  currency: string;
  notes: string;
  receiptPath: string | null;
  data: ExpenseData;
}

export function emptyDraft(currency: string, date: string): ExpenseDraft {
  return {
    title: "",
    date,
    location: "",
    currency,
    notes: "",
    receiptPath: null,
    data: { participants: [], items: [], discount: { mode: "none", value: 0 }, charges: [], payments: [], settledPairs: [], forceSettled: false },
  };
}
