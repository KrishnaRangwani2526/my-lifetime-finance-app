import { useMemo, useState } from "react";
import { Download, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/csv";
import { buildLedgerCsv, csvFileName, isStatementRow } from "@/lib/ledgerCsv";
import { formatMoney, formatMonthLabel, num, type Transaction } from "@/lib/finance";
import { cn } from "@/lib/utils";

/**
 * Month-wise CSV folders for one account / wallet / card.
 * Each month holds up to two sheets: the app sheet (your manual entries) and
 * the statement sheet (imported rows). The statement sheet only appears once
 * something has actually been imported.
 */
export function CsvVault({
  txns,
  ownerLabel,
  currency,
  categoryName,
}: {
  txns: Transaction[];
  ownerLabel: string;
  currency: string;
  categoryName: (id: string | null) => string;
}) {
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const ctx = { currency, ownerLabel, categoryName };

  const months = useMemo(() => {
    const map = new Map<string, { app: Transaction[]; statement: Transaction[] }>();
    for (const t of txns) {
      const key = t.txn_date.slice(0, 7);
      const bucket = map.get(key) ?? { app: [], statement: [] };
      (isStatementRow(t) ? bucket.statement : bucket.app).push(t);
      map.set(key, bucket);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [txns]);

  const appAll = txns.filter((t) => !isStatementRow(t));
  const stmtAll = txns.filter(isStatementRow);

  if (txns.length === 0) return null;

  return (
    <section className="surface-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="font-display text-sm font-semibold">CSV sheets</h2>
        <span className="text-[11px] text-muted-foreground">{months.length} month folders</span>
      </div>

      <div className="space-y-2 px-4 pb-3">
        <SheetButton
          label="All months — app sheet"
          count={appAll.length}
          onClick={() =>
            downloadText(csvFileName(ownerLabel, "app"), buildLedgerCsv(appAll, ctx))
          }
        />
        {stmtAll.length > 0 && (
          <SheetButton
            label="All months — statement sheet"
            count={stmtAll.length}
            tone="statement"
            onClick={() =>
              downloadText(csvFileName(ownerLabel, "statement"), buildLedgerCsv(stmtAll, ctx))
            }
          />
        )}
      </div>

      <div className="divide-y divide-border border-t border-border">
        {months.map(([month, bucket]) => {
          const expanded = openMonth === month;
          const net = [...bucket.app, ...bucket.statement].reduce(
            (s, t) => s + (t.direction === "credit" ? num(t.amount) : -num(t.amount)),
            0,
          );
          return (
            <div key={month}>
              <button
                onClick={() => setOpenMonth(expanded ? null : month)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-secondary/60"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
                  <FolderOpen className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{formatMonthLabel(`${month}`)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {bucket.app.length} app · {bucket.statement.length} statement
                  </p>
                </div>
                <span
                  className={cn(
                    "numeric text-sm font-semibold",
                    net >= 0 ? "text-credit" : "text-debit",
                  )}
                >
                  {formatMoney(net, currency, true)}
                </span>
              </button>
              {expanded && (
                <div className="space-y-2 px-4 pb-3">
                  {bucket.app.length > 0 && (
                    <SheetButton
                      label={`App sheet · ${month}`}
                      count={bucket.app.length}
                      onClick={() =>
                        downloadText(
                          csvFileName(ownerLabel, "app", month),
                          buildLedgerCsv(bucket.app, ctx),
                        )
                      }
                    />
                  )}
                  {bucket.statement.length > 0 && (
                    <SheetButton
                      label={`Statement sheet · ${month}`}
                      count={bucket.statement.length}
                      tone="statement"
                      onClick={() =>
                        downloadText(
                          csvFileName(ownerLabel, "statement", month),
                          buildLedgerCsv(bucket.statement, ctx),
                        )
                      }
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SheetButton({
  label,
  count,
  onClick,
  tone = "app",
}: {
  label: string;
  count: number;
  onClick: () => void;
  tone?: "app" | "statement";
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="h-11 w-full justify-between gap-2 rounded-2xl px-3.5"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Download className={cn("size-4", tone === "statement" ? "text-accent" : "text-primary")} />
        <span className="truncate text-xs font-medium">{label}</span>
      </span>
      <span className="numeric shrink-0 text-[11px] text-muted-foreground">{count} rows</span>
    </Button>
  );
}
