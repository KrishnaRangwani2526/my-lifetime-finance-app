import { useMemo, useState } from "react";
import { Archive, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
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
import { useStartNewMonth } from "@/hooks/useLedger";
import { buildLedgerCsv } from "@/lib/ledgerCsv";
import {
  accountBalance,
  formatExactDate,
  formatMoney,
  monthKey,
  num,
  previousMonthEndISO,
  monthStartISO,
  cardOutstanding,
  type BankAccount,
  type CardAccount,
  type Category,
  type Transaction,
} from "@/lib/finance";

export function StartNewMonthSheet({
  accounts,
  cards,
  transactions,
  categories,
  currency,
}: {
  accounts: BankAccount[];
  cards: CardAccount[];
  transactions: Transaction[];
  categories: Category[];
  currency: string;
}) {
  const startNewMonth = useStartNewMonth();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(
    new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  );
  const periodStart = monthStartISO(-1);
  const periodEnd = previousMonthEndISO();
  const nextStart = monthStartISO();
  const previousMonth = monthKey(periodStart);
  const previousRows = transactions.filter((transaction) => monthKey(transaction.txn_date) === previousMonth);
  const categoryName = (id: string | null) => categories.find((category) => category.id === id)?.name ?? "Uncategorised";
  const assetCount = accounts.length + cards.length;

  const summary = useMemo(() => {
    const credit = previousRows.filter((row) => row.direction === "credit").reduce((sum, row) => sum + num(row.amount), 0);
    const debit = previousRows.filter((row) => row.direction === "debit").reduce((sum, row) => sum + num(row.amount), 0);
    return { credit, debit };
  }, [previousRows]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (assetCount === 0) {
      toast.error("Add an account, wallet or card before starting a month");
      return;
    }

    const periods = [
      ...accounts.map((account) => {
        const rows = previousRows.filter(
          (transaction) => transaction.linked_type === "account" && transaction.linked_id === account.id,
        );
        const closing = accountBalance(account.id, transactions);
        const totalCredit = rows.filter((row) => row.direction === "credit").reduce((sum, row) => sum + num(row.amount), 0);
        const totalDebit = rows.filter((row) => row.direction === "debit").reduce((sum, row) => sum + num(row.amount), 0);
        return {
          linked_type: "account" as const,
          linked_id: account.id,
          label: `${label.trim() || previousMonth} · ${account.name}`,
          opening_balance: closing - totalCredit + totalDebit,
          closing_balance: closing,
          total_credit: totalCredit,
          total_debit: totalDebit,
          entry_count: rows.length,
          csv_data: buildLedgerCsv(rows, { currency, ownerLabel: account.name, categoryName }),
          spend_limit: account.spend_limit === null ? null : num(account.spend_limit),
        };
      }),
      ...cards.map((card) => {
        const rows = previousRows.filter(
          (transaction) => transaction.linked_type === "card" && transaction.linked_id === card.id,
        );
        const closing = cardOutstanding(card.id, transactions);
        const totalCredit = rows.filter((row) => row.direction === "credit").reduce((sum, row) => sum + num(row.amount), 0);
        const totalDebit = rows.filter((row) => row.direction === "debit").reduce((sum, row) => sum + num(row.amount), 0);
        return {
          linked_type: "card" as const,
          linked_id: card.id,
          label: `${label.trim() || previousMonth} · ${card.name}`,
          opening_balance: closing - totalDebit + totalCredit,
          closing_balance: closing,
          total_credit: totalCredit,
          total_debit: totalDebit,
          entry_count: rows.length,
          csv_data: buildLedgerCsv(rows, { currency, ownerLabel: card.name, categoryName }),
          spend_limit: card.spend_limit === null ? null : num(card.spend_limit),
        };
      }),
    ];

    try {
      await startNewMonth.mutateAsync({ periodStart, periodEnd, nextStart, periods });
      toast.success("Previous month archived — new month starts at zero");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the new month");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 rounded-2xl">
          <RotateCcw className="size-4" />
          Start new month
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Start a clean month</SheetTitle>
          <SheetDescription>
            Archive {formatExactDate(periodStart)} to {formatExactDate(periodEnd)} for every account, wallet and card. Your old activity stays in Reports, while all live balances restart at zero on {formatExactDate(nextStart)}.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-3 py-3">
            <Archive className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 text-xs">
              <p className="font-semibold">{assetCount} spaces will be reset</p>
              <p className="text-muted-foreground">
                {formatMoney(summary.credit, currency, true)} in · {formatMoney(summary.debit, currency, true)} out · {previousRows.length} entries
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="month-label">Archive label</Label>
            <Input id="month-label" value={label} onChange={(event) => setLabel(event.target.value)} className="h-12" />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={startNewMonth.isPending}>
            {startNewMonth.isPending && <Loader2 className="size-4 animate-spin" />}
            Archive &amp; start at zero
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}