import { formatMoney, num, type Transaction } from "@/lib/finance";
import { STATEMENT_SOURCE, safeFileName, toCSV } from "@/lib/csv";

export type CsvContext = {
  currency: string;
  ownerLabel: string;
  categoryName: (id: string | null) => string;
};

const HEADERS = [
  "Date",
  "Month",
  "Account / Card",
  "Direction",
  "Amount",
  "Category",
  "Description",
  "Merchant",
  "Recorded via",
];

export function isStatementRow(t: Transaction) {
  return t.source === STATEMENT_SOURCE;
}

export function txnToRow(t: Transaction, ctx: CsvContext) {
  return {
    Date: t.txn_date,
    Month: t.txn_date.slice(0, 7),
    "Account / Card": ctx.ownerLabel,
    Direction: t.direction === "credit" ? "Credit (money in)" : "Debit (money out)",
    Amount: num(t.amount).toFixed(2),
    Category: ctx.categoryName(t.category_id),
    Description: t.description ?? "",
    Merchant: t.merchant ?? "",
    "Recorded via": t.source,
  };
}

export function buildLedgerCsv(txns: Transaction[], ctx: CsvContext): string {
  const sorted = [...txns].sort((a, b) => a.txn_date.localeCompare(b.txn_date));
  const rows = sorted.map((t) => txnToRow(t, ctx));
  const credit = sorted
    .filter((t) => t.direction === "credit")
    .reduce((s, t) => s + num(t.amount), 0);
  const debit = sorted
    .filter((t) => t.direction === "debit")
    .reduce((s, t) => s + num(t.amount), 0);

  const body = toCSV(rows, HEADERS);
  const totals = [
    "",
    ["TOTALS", "", "", "Credit", credit.toFixed(2), "", "", "", ""].join(","),
    ["", "", "", "Debit", debit.toFixed(2), "", "", "", ""].join(","),
    ["", "", "", "Net", (credit - debit).toFixed(2), "", "", "", ""].join(","),
    ["", "", "", "Net (display)", formatMoney(credit - debit, ctx.currency).replace(/,/g, ""), "", "", "", ""].join(","),
  ].join("\n");

  return `${body}\n${totals}`;
}

/** e.g. hdfc-savings_app_2026-08.csv */
export function csvFileName(owner: string, kind: "app" | "statement", month?: string) {
  return `${safeFileName(owner)}_${kind}${month ? `_${month}` : "_all"}.csv`;
}

/** Cumulative sheet across every account, wallet and card. */
export function buildCumulativeCsv(
  txns: Transaction[],
  ownerLabel: (t: Transaction) => string,
  ctx: Omit<CsvContext, "ownerLabel">,
): string {
  const sorted = [...txns].sort((a, b) => a.txn_date.localeCompare(b.txn_date));
  let running = 0;
  const rows = sorted.map((t) => {
    const signed = t.direction === "credit" ? num(t.amount) : -num(t.amount);
    running += signed;
    return {
      ...txnToRow(t, { ...ctx, ownerLabel: ownerLabel(t) }),
      "Running net": running.toFixed(2),
    };
  });
  return toCSV(rows, [...HEADERS, "Running net"]);
}
