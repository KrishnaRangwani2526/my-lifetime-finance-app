import type { Tables } from "@/integrations/supabase/types";

export type BankAccount = Tables<"bank_accounts">;
export type CardAccount = Tables<"card_accounts">;
export type Transaction = Tables<"transactions">;
export type Category = Tables<"categories">;
export type Emi = Tables<"emis">;
export type Recurring = Tables<"recurring_transactions">;
export type Template = Tables<"quick_entry_templates">;
export type Profile = Tables<"profiles">;

export type Direction = "credit" | "debit";
export type LinkedType = "account" | "card";

export const CURRENCIES = [
  { code: "INR", symbol: "₹", locale: "en-IN" },
  { code: "USD", symbol: "$", locale: "en-US" },
  { code: "EUR", symbol: "€", locale: "de-DE" },
  { code: "GBP", symbol: "£", locale: "en-GB" },
  { code: "AED", symbol: "AED ", locale: "en-AE" },
] as const;

export function currencyMeta(code: string | null | undefined) {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function formatMoney(value: number, code = "INR", compact = false): string {
  const meta = currencyMeta(code);
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
    maximumFractionDigits: compact ? 1 : 2,
    minimumFractionDigits: compact ? 0 : 2,
    notation: compact ? "compact" : "standard",
  }).format(value);
}

export function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthStartISO(offset = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 10);
}

export function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export function monthLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

/** Signed effect of a transaction on a bank balance. */
export function signedAmount(t: Pick<Transaction, "amount" | "direction">): number {
  const value = num(t.amount);
  return t.direction === "credit" ? value : -value;
}

/**
 * Bank balance = latest anchor balance + every transaction after the anchor date.
 * Without an anchor it is the net of all transactions.
 */
export function accountBalance(
  accountId: string,
  transactions: Transaction[],
  anchor?: { as_of_date: string; balance_amount: string | number } | null,
): number {
  const base = anchor ? num(anchor.balance_amount) : 0;
  return transactions
    .filter(
      (t) =>
        t.linked_type === "account" &&
        t.linked_id === accountId &&
        (!anchor || t.txn_date > anchor.as_of_date),
    )
    .reduce((sum, t) => sum + signedAmount(t), base);
}

/** Card outstanding: debits increase what you owe, credits (payments) reduce it. */
export function cardOutstanding(cardId: string, transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.linked_type === "card" && t.linked_id === cardId)
    .reduce((sum, t) => sum + (t.direction === "debit" ? num(t.amount) : -num(t.amount)), 0);
}

export function nextDueDate(dayOfMonth: number): string {
  const now = new Date();
  const day = Math.min(Math.max(dayOfMonth, 1), 28);
  const candidate = new Date(now.getFullYear(), now.getMonth(), day);
  if (candidate < now) candidate.setMonth(candidate.getMonth() + 1);
  return candidate.toISOString().slice(0, 10);
}

export function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00`).getTime();
  const now = new Date(todayISO() + "T00:00:00").getTime();
  return Math.round((target - now) / 86_400_000);
}

export function advanceDate(iso: string, frequency: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (frequency === "daily") d.setDate(d.getDate() + 1);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;
export const ACCOUNT_TYPES = ["bank", "wallet"] as const;
export const SOURCE_APPS = ["phonepe", "paytm", "gpay", "other"] as const;
