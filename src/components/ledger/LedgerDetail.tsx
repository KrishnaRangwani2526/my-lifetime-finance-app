import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Loader2, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CsvVault } from "@/components/ledger/CsvVault";
import { EmiSheet } from "@/components/ledger/EmiSheet";
import { ImportStatementSheet } from "@/components/ledger/ImportStatementSheet";
import { PeriodPanel } from "@/components/ledger/PeriodPanel";
import { QuickEntrySheet } from "@/components/ledger/QuickEntrySheet";
import { TransactionRow } from "@/components/ledger/TransactionRow";
import {
  latestAnchor,
  useAnchors,
  useCategories,
  useEmis,
  useResetBalance,
  useTransactions,
} from "@/hooks/useLedger";
import {
  emiNextDate,
  formatExactDate,
  formatMonthLabel,
  formatMoney,
  num,
  todayISO,
} from "@/lib/finance";
import { isStatementRow } from "@/lib/ledgerCsv";
import { cn } from "@/lib/utils";

export function LedgerDetail({
  linkedType,
  linkedId,
  name,
  subtitle,
  currency,
  hero,
  balance,
  spendLimit = null,
  editSheet,
}: {
  linkedType: "account" | "card";
  linkedId: string;
  name: string;
  subtitle: string;
  currency: string;
  hero: ReactNode;
  /** Current balance (accounts/wallets) or outstanding (cards). */
  balance: number;
  spendLimit?: number | null;
  editSheet?: ReactNode;
}) {
  const navigate = useNavigate();
  const { data: allTxns = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: emis = [] } = useEmis();
  const { data: anchors = [] } = useAnchors();
  const [tab, setTab] = useState<"all" | "app" | "statement">("all");

  const txns = useMemo(
    () => allTxns.filter((t) => t.linked_id === linkedId),
    [allTxns, linkedId],
  );
  const hasImported = txns.some(isStatementRow);
  const shown = txns.filter((t) =>
    tab === "all" ? true : tab === "statement" ? isStatementRow(t) : !isStatementRow(t),
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof shown>();
    for (const t of shown) {
      const key = t.txn_date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [shown]);

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "Uncategorised";

  const myEmis = emis.filter((e) => e.linked_id === linkedId);
  const anchor = latestAnchor(anchors, linkedId);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-lg px-4 pb-32 pt-4">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() =>
              void navigate({ to: linkedType === "card" ? "/cards" : "/accounts" })
            }
            aria-label="Back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-semibold">{name}</h1>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
          {editSheet}
        </div>

        {hero}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Link
            to="/add"
            search={{ linked: `${linkedType}:${linkedId}` }}
            className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground active:scale-[0.99]"
          >
            <Plus className="size-4.5" />
            Add entry to {name}
          </Link>
          <QuickEntrySheet
            linkedType={linkedType}
            linkedId={linkedId}
            ownerLabel={name}
            currency={currency}
          />
          <EmiSheet linkedType={linkedType} linkedId={linkedId} ownerLabel={name} />
          <ImportStatementSheet
            linkedType={linkedType}
            linkedId={linkedId}
            ownerLabel={name}
            currency={currency}
            hasImported={hasImported}
          />
          <ResetBalanceSheet
            linkedType={linkedType}
            accountId={linkedId}
            name={name}
            currentBalance={balance}
          />
        </div>

        <PeriodPanel
          linkedType={linkedType}
          linkedId={linkedId}
          ownerLabel={name}
          currency={currency}
          txns={txns}
          balance={balance}
          spendLimit={spendLimit}
          periodStart={anchor?.as_of_date ?? null}
          categoryName={categoryName}
        />

        {myEmis.length > 0 && (
          <section className="surface-card mt-4 divide-y divide-border overflow-hidden">
            <h2 className="px-4 pb-2 pt-4 font-display text-sm font-semibold">EMIs on {name}</h2>
            {myEmis.map((e) => {
              const next = emiNextDate(e);
              return (
                <Link
                  key={e.id}
                  to="/emis"
                  className="flex items-center gap-3 px-4 py-3 active:bg-secondary/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {next ? `Next ${formatExactDate(next)}` : "Completed"} ·{" "}
                      {e.installments_paid}/{e.total_installments} paid
                    </p>
                  </div>
                  <p className="numeric text-sm font-semibold text-debit">
                    {formatMoney(num(e.monthly_amount), currency)}
                  </p>
                </Link>
              );
            })}
          </section>
        )}

        <div className="mt-4">
          <CsvVault
            txns={txns}
            ownerLabel={name}
            currency={currency}
            categoryName={categoryName}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-secondary p-1">
          {(["all", "app", "statement"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              disabled={t === "statement" && !hasImported}
              className={cn(
                "rounded-full py-2 text-xs font-semibold capitalize transition-colors disabled:opacity-40",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {t === "app" ? "My entries" : t === "statement" ? "Statement" : "All"}
            </button>
          ))}
        </div>

        {grouped.length === 0 ? (
          <p className="surface-card mt-3 px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing recorded here yet.
          </p>
        ) : (
          grouped.map(([month, rows]) => (
            <section key={month} className="mt-3">
              <h3 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {formatMonthLabel(month)}
              </h3>
              <div className="surface-card divide-y divide-border overflow-hidden">
                {rows.map((t) => (
                  <TransactionRow
                    key={t.id}
                    txn={t}
                    currency={currency}
                    categoryName={categoryName(t.category_id)}
                    sourceName={isStatementRow(t) ? "statement" : undefined}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

/** Balance / outstanding reset — later entries are counted from this figure. */
function ResetBalanceSheet({
  linkedType,
  accountId,
  name,
  currentBalance,
}: {
  linkedType: "account" | "card";
  accountId: string;
  name: string;
  currentBalance: number;
}) {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState("");
  const [asOf, setAsOf] = useState(todayISO());
  const reset = useResetBalance();
  const isCard = linkedType === "card";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(balance);
    if (!Number.isFinite(value) || balance.trim() === "") {
      toast.error(isCard ? "Enter the outstanding you can see today" : "Enter the balance you can see today");
      return;
    }
    try {
      await reset.mutateAsync({ accountId, balance: value, asOf, linkedType });
      toast.success("Reset done — new entries count from here");
      setBalance("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-2xl">
          <RotateCcw className="size-4" />
          Reset balance
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Reset {name}</SheetTitle>
          <SheetDescription>
            {isCard
              ? "Enter the outstanding your card app shows right now. Every spend and payment after this date is calculated from this figure."
              : "Enter the real balance you can see right now. Every credit and debit after this date is calculated from this figure, so drift is wiped out."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="rb-amt">{isCard ? "Actual outstanding" : "Actual balance"}</Label>
            <Input
              id="rb-amt"
              value={balance}
              onChange={(e) => setBalance(e.target.value.replace(/[^0-9.-]/g, ""))}
              inputMode="decimal"
              placeholder={currentBalance.toFixed(2)}
              className="numeric h-12"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rb-date">As of</Label>
            <Input
              id="rb-date"
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="h-12"
            />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={reset.isPending}>
            {reset.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Reset
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
