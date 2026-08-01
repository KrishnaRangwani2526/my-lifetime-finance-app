import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, type LucideIcon } from "lucide-react";
import { formatDay, formatMoney, num, type Transaction } from "@/lib/finance";
import { cn } from "@/lib/utils";

export function TransactionRow({
  txn,
  categoryName,
  sourceName,
  currency,
}: {
  txn: Transaction;
  categoryName?: string | undefined;
  sourceName?: string | undefined;
  currency: string;
}) {
  const credit = txn.direction === "credit";
  return (
    <Link
      to="/add"
      search={{ id: txn.id }}
      className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-secondary/60"
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          credit ? "bg-credit/15 text-credit" : "bg-debit/15 text-debit",
        )}
      >
        {credit ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {txn.description || txn.merchant || categoryName || (credit ? "Money in" : "Money out")}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {[categoryName, sourceName].filter(Boolean).join(" · ") || formatDay(txn.txn_date)}
        </p>
      </div>
      <div className="text-right">
        <p className={cn("numeric text-sm font-semibold", credit ? "text-credit" : "text-foreground")}>
          {credit ? "+" : "−"}
          {formatMoney(num(txn.amount), currency)}
        </p>
        <p className="text-[11px] text-muted-foreground">{formatDay(txn.txn_date)}</p>
      </div>
    </Link>
  );
}

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "credit" | "debit";
}) {
  return (
    <div className="surface-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon
          className={cn(
            "size-4",
            tone === "credit" && "text-credit",
            tone === "debit" && "text-debit",
            tone === "default" && "text-muted-foreground",
          )}
        />
      </div>
      <p
        className={cn(
          "numeric font-display text-lg font-semibold",
          tone === "credit" && "text-credit",
          tone === "debit" && "text-debit",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 mt-6 flex items-center justify-between">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </h2>
      {action}
    </div>
  );
}
