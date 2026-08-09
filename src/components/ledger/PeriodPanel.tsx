import { useMemo, useState } from "react";
import { Archive, Download, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useClosePeriod, useDeletePeriod, usePeriods } from "@/hooks/useLedger";
import { downloadText, safeFileName } from "@/lib/csv";
import { buildLedgerCsv } from "@/lib/ledgerCsv";
import {
  formatExactDate,
  formatMoney,
  num,
  periodSpend,
  todayISO,
  type Transaction,
} from "@/lib/finance";
import { cn } from "@/lib/utils";

/**
 * Spend limit + "save & start new" for one account, wallet or card.
 * Closing a period stores its totals and CSV, then re-anchors the balance
 * and asks for the next period's limit.
 */
export function PeriodPanel({
  linkedType,
  linkedId,
  ownerLabel,
  currency,
  txns,
  balance,
  spendLimit,
  periodStart,
  categoryName,
}: {
  linkedType: "account" | "card";
  linkedId: string;
  ownerLabel: string;
  currency: string;
  txns: Transaction[];
  balance: number;
  spendLimit: number | null;
  periodStart: string | null;
  categoryName: (id: string | null) => string;
}) {
  const { data: allPeriods = [] } = usePeriods();
  const close = useClosePeriod();
  const removePeriod = useDeletePeriod();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }));
  const [newBalance, setNewBalance] = useState(String(balance.toFixed(2)));
  const [newLimit, setNewLimit] = useState(spendLimit ? String(spendLimit) : "");

  const periods = useMemo(
    () => allPeriods.filter((p) => p.linked_id === linkedId),
    [allPeriods, linkedId],
  );

  const open_ = txns.filter((t) => !periodStart || t.txn_date >= periodStart);
  const credit = open_.filter((t) => t.direction === "credit").reduce((s, t) => s + num(t.amount), 0);
  const debit = open_.filter((t) => t.direction === "debit").reduce((s, t) => s + num(t.amount), 0);
  const spent = periodSpend(linkedId, txns, periodStart);
  const limitPct = spendLimit && spendLimit > 0 ? Math.min((spent / spendLimit) * 100, 100) : 0;
  const overLimit = !!spendLimit && spendLimit > 0 && spent > spendLimit;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = Number(newBalance);
    if (!Number.isFinite(next)) {
      toast.error("Enter the balance the new period starts with");
      return;
    }
    const csv = buildLedgerCsv(open_, { currency, ownerLabel, categoryName });
    try {
      await close.mutateAsync({
        linkedType,
        linkedId,
        label: label.trim() || todayISO(),
        periodStart: periodStart ?? (open_[0]?.txn_date ?? todayISO()),
        periodEnd: todayISO(),
        openingBalance: balance - credit + debit,
        closingBalance: balance,
        totalCredit: credit,
        totalDebit: debit,
        entryCount: open_.length,
        csv,
        newBalance: next,
        newLimit: newLimit.trim() === "" ? null : Number(newLimit) || 0,
      });
      toast.success("Period saved — new entries start from the new balance");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the period");
    }
  }

  return (
    <section className="surface-card mt-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold">This period</h2>
        <span className="text-[11px] text-muted-foreground">
          {periodStart ? `since ${formatExactDate(periodStart)}` : "all entries"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 text-sm">
        <div className="rounded-2xl bg-secondary/60 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Money in</p>
          <p className="numeric font-semibold text-credit">{formatMoney(credit, currency)}</p>
        </div>
        <div className="rounded-2xl bg-secondary/60 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Money out</p>
          <p className="numeric font-semibold text-debit">{formatMoney(debit, currency)}</p>
        </div>
      </div>

      {spendLimit && spendLimit > 0 ? (
        <div className="mt-3">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground">Spend limit</span>
            <span className={cn("numeric", overLimit && "text-debit")}>
              {formatMoney(spent, currency, true)} / {formatMoney(spendLimit, currency, true)}
            </span>
          </div>
          <Progress value={limitPct} className="h-2" />
          {overLimit && (
            <p className="mt-1.5 text-[11px] text-debit">
              You are over the limit by {formatMoney(spent - spendLimit, currency)}.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-muted-foreground">
          No spend limit set — add one from Edit details.
        </p>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="secondary" className="mt-3 h-11 w-full justify-center gap-2 rounded-2xl">
            <Save className="size-4" />
            Save &amp; start new period
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Close period for {ownerLabel}</SheetTitle>
            <SheetDescription>
              Totals and a CSV of this period are stored, then entries start counting from the new
              balance and limit you set here.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={submit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="pp-label">Period name</Label>
              <Input
                id="pp-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="August 2026"
                className="h-12"
              />
            </div>
            <div className="rounded-2xl bg-secondary/60 px-3 py-2.5 text-xs">
              <p className="numeric">
                Closing balance {formatMoney(balance, currency)} · in{" "}
                {formatMoney(credit, currency)} · out {formatMoney(debit, currency)} ·{" "}
                {open_.length} entr{open_.length === 1 ? "y" : "ies"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-bal">New starting balance</Label>
              <Input
                id="pp-bal"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value.replace(/[^0-9.-]/g, ""))}
                inputMode="decimal"
                className="numeric h-12"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-limit">New spend limit (optional)</Label>
              <Input
                id="pp-limit"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="25000"
                className="numeric h-12"
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={close.isPending}>
              {close.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save period &amp; start fresh
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {periods.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Archive className="size-3.5" /> Saved periods
          </p>
          <div className="space-y-2">
            {periods.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-2xl bg-secondary/50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.label}</p>
                  <p className="numeric text-[11px] text-muted-foreground">
                    {formatExactDate(p.period_start)} – {formatExactDate(p.period_end)} · in{" "}
                    {formatMoney(num(p.total_credit), currency, true)} · out{" "}
                    {formatMoney(num(p.total_debit), currency, true)} · closed{" "}
                    {formatMoney(num(p.closing_balance), currency, true)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    downloadText(
                      `${safeFileName(ownerLabel)}_${safeFileName(p.label)}.csv`,
                      p.csv_data ?? "",
                    )
                  }
                  aria-label={`Download ${p.label} CSV`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary"
                >
                  <Download className="size-4" />
                </button>
                <button
                  onClick={() => {
                    void removePeriod.mutateAsync(p.id).then(() => toast.success("Period deleted"));
                  }}
                  aria-label={`Delete ${p.label}`}
                  className="shrink-0 text-muted-foreground active:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
