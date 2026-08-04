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

/** Full weekday for a ledger date, e.g. "Monday". */
export function weekdayName(iso: string): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" });
}

export function monthLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

/** Accepts "YYYY-MM" and returns e.g. "March 2026". */
export function formatMonthLabel(yearMonth: string): string {
  return new Date(`${yearMonth}-01T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
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

/** Days in a given month (1-indexed month). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Next calendar occurrence of a day-of-month, clamped to the month length.
 * `from` lets us chain (e.g. the due date that follows a billing date).
 */
export function nextOnDay(dayOfMonth: number, from: Date = new Date()): string {
  const day = Math.min(Math.max(Math.round(dayOfMonth) || 1, 1), 31);
  const base = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = 0; i < 3; i++) {
    const y = base.getFullYear();
    const m = base.getMonth() + i;
    const d = new Date(y, m, 1);
    const clamped = Math.min(day, daysInMonth(d.getFullYear(), d.getMonth()));
    const candidate = new Date(d.getFullYear(), d.getMonth(), clamped);
    if (candidate >= new Date(from.getFullYear(), from.getMonth(), from.getDate()))
      return candidate.toISOString().slice(0, 10);
  }
  return todayISO();
}

export function nextDueDate(dayOfMonth: number): string {
  return nextOnDay(dayOfMonth);
}

/** Exact upcoming statement (billing) date and the payment due date that follows it. */
export function cardCycle(billingDay: number, dueDay: number) {
  const billing = nextOnDay(billingDay);
  const billingDate = new Date(`${billing}T00:00:00`);
  // The due day belongs to the cycle that closes on the billing date, so it is
  // the first occurrence of the due day on/after that billing date.
  const due = nextOnDay(dueDay, billingDate);
  return { billing, due };
}

/** Next instalment date for an EMI: start date advanced by instalments already paid. */
export function emiNextDate(emi: {
  start_date: string;
  installments_paid: number;
  total_installments: number;
}): string | null {
  if (emi.installments_paid >= emi.total_installments) return null;
  const d = new Date(`${emi.start_date}T00:00:00`);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + emi.installments_paid, 1);
  target.setDate(Math.min(day, daysInMonth(target.getFullYear(), target.getMonth())));
  return target.toISOString().slice(0, 10);
}

/** "2026-08" for any ISO date. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
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

/** "12 Aug 2026" — used wherever an exact billing / due date must be shown. */
export function formatExactDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
