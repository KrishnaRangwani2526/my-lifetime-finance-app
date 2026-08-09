import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { LedgerDetail } from "@/components/ledger/LedgerDetail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  latestAnchor,
  useAccounts,
  useAnchors,
  useProfile,
  useSaveRow,
  useTransactions,
} from "@/hooks/useLedger";
import {
  accountBalance,
  formatExactDate,
  formatMoney,
  num,
  type BankAccount,
} from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/accounts/$accountId")({
  head: () => ({
    meta: [
      { title: "Account ledger — MyLedger" },
      {
        name: "description",
        content: "Entries, EMIs, statement imports and month-wise CSV sheets for this account.",
      },
      { property: "og:title", content: "Account ledger — MyLedger" },
      {
        property: "og:description",
        content: "Entries, EMIs, statement imports and month-wise CSV sheets for this account.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AccountDetail />
    </RequireAuth>
  ),
});

function AccountDetail() {
  const { accountId } = Route.useParams();
  const { data: profile } = useProfile();
  const { data: accounts = [] } = useAccounts();
  const { data: txns = [] } = useTransactions();
  const { data: anchors = [] } = useAnchors();

  const account = accounts.find((a) => a.id === accountId);
  const currency = profile?.currency ?? "INR";
  if (!account) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center text-sm text-muted-foreground">
        This account no longer exists.
      </div>
    );
  }

  const anchor = latestAnchor(anchors, account.id);
  const balance = accountBalance(account.id, txns, anchor);
  const isWallet = account.account_type === "wallet";
  const limit = account.spend_limit === null ? null : num(account.spend_limit);

  return (
    <LedgerDetail
      linkedType="account"
      linkedId={account.id}
      name={account.name}
      subtitle={account.bank_name || (isWallet ? "Wallet" : "Bank account")}
      currency={currency}
      balance={balance}
      spendLimit={limit}
      editSheet={<EditAccountSheet account={account} />}
      hero={
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">
            {isWallet ? "Wallet balance" : "Account balance"}
          </p>
          <p className={cn("numeric font-display text-3xl font-semibold", balance < 0 && "text-debit")}>
            {formatMoney(balance, currency)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {anchor
              ? `Counted from your reset of ${formatMoney(num(anchor.balance_amount), currency)} on ${formatExactDate(anchor.as_of_date)}`
              : "Net of every entry recorded here"}
          </p>
        </div>
      }
    />
  );
}

function EditAccountSheet({ account }: { account: BankAccount }) {
  const save = useSaveRow("bank_accounts");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(account.name);
  const [bank, setBank] = useState(account.bank_name ?? "");
  const [type, setType] = useState(account.account_type);
  const [limit, setLimit] = useState(account.spend_limit === null ? "" : String(num(account.spend_limit)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give it a name");
      return;
    }
    try {
      await save.mutateAsync({
        id: account.id,
        values: {
          name: name.trim(),
          bank_name: bank.trim(),
          account_type: type,
          spend_limit: limit.trim() === "" ? null : Number(limit) || 0,
        },
      });
      toast.success("Details updated");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          aria-label="Edit details"
          className="size-10 shrink-0 rounded-full"
        >
          <Pencil className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Edit {account.name}</SheetTitle>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
            {(["bank", "wallet"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "rounded-full py-2 text-xs font-semibold",
                  type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {t === "bank" ? "Bank account" : "Wallet"}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ea-name">Name</Label>
            <Input id="ea-name" value={name} onChange={(e) => setName(e.target.value)} className="h-12" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ea-bank">{type === "wallet" ? "Provider" : "Bank"}</Label>
            <Input id="ea-bank" value={bank} onChange={(e) => setBank(e.target.value)} className="h-12" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ea-limit">Maximum spend limit</Label>
            <Input
              id="ea-limit"
              value={limit}
              onChange={(e) => setLimit(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="25000"
              className="numeric h-12"
            />
            <p className="text-[11px] text-muted-foreground">
              Leave empty for no limit. Spending is tracked against it for the open period.
            </p>
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save details
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
