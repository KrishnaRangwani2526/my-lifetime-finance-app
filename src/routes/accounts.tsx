import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Landmark, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, MobileScreen, ScreenHeader } from "@/components/AppShell";
import {
  latestAnchor,
  useAccounts,
  useAnchors,
  useDeleteRow,
  useProfile,
  useResetBalance,
  useSaveRow,
  useTransactions,
} from "@/hooks/useLedger";
import { accountBalance, formatMoney, todayISO } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "Bank accounts & wallets — MyLedger" },
      {
        name: "description",
        content:
          "Separate spaces for bank accounts and wallets, each with a live balance, resettable any time.",
      },
      { property: "og:title", content: "Bank accounts & wallets — MyLedger" },
      {
        property: "og:description",
        content:
          "Separate spaces for bank accounts and wallets, each with a live balance, resettable any time.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Accounts />
    </RequireAuth>
  ),
});

function Accounts() {
  const { data: profile } = useProfile();
  const { data: accounts = [] } = useAccounts();
  const { data: txns = [] } = useTransactions();
  const { data: anchors = [] } = useAnchors();
  const save = useSaveRow("bank_accounts");
  const remove = useDeleteRow("bank_accounts");
  const reset = useResetBalance();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"bank" | "wallet">("bank");
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [opening, setOpening] = useState("");

  const currency = profile?.currency ?? "INR";
  const banks = accounts.filter((a) => a.account_type !== "wallet");
  const wallets = accounts.filter((a) => a.account_type === "wallet");
  const list = tab === "bank" ? banks : wallets;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give it a name");
      return;
    }
    try {
      // Insert the row, then anchor its starting balance so every later entry
      // is calculated from that figure.
      const created = await save.mutateAsync({
        values: { name: name.trim(), bank_name: bank.trim(), account_type: tab },
      });
      const start = Number(opening);
      if (created?.id && Number.isFinite(start) && start !== 0) {
        await reset.mutateAsync({ accountId: created.id, balance: start, asOf: todayISO() });
      }
      toast.success(tab === "wallet" ? "Wallet added" : "Account added");
      setName("");
      setBank("");
      setOpening("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <MobileScreen>
      <ScreenHeader
        title="Accounts"
        subtitle="Bank accounts and wallets, kept apart"
        action={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="size-10 shrink-0 rounded-full">
                <Plus className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>New {tab === "wallet" ? "wallet" : "bank account"}</SheetTitle>
              </SheetHeader>
              <form onSubmit={submit} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
                  {(["bank", "wallet"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={cn(
                        "rounded-full py-2 text-xs font-semibold",
                        tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      {t === "bank" ? "Bank account" : "Wallet"}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-name">Name</Label>
                  <Input
                    id="acc-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={tab === "wallet" ? "PhonePe wallet" : "HDFC Savings"}
                    className="h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-bank">
                    {tab === "wallet" ? "Provider (optional)" : "Bank (optional)"}
                  </Label>
                  <Input
                    id="acc-bank"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    placeholder={tab === "wallet" ? "PhonePe" : "HDFC Bank"}
                    className="h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-open">Starting balance</Label>
                  <Input
                    id="acc-open"
                    value={opening}
                    onChange={(e) => setOpening(e.target.value.replace(/[^0-9.]/g, ""))}
                    inputMode="decimal"
                    placeholder="50000"
                    className="numeric h-12"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    You can reset this figure any time from inside the account.
                  </p>
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                  {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Add {tab === "wallet" ? "wallet" : "account"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
        {(["bank", "wallet"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full py-2 text-xs font-semibold transition-colors",
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {t === "bank" ? `Bank accounts (${banks.length})` : `Wallets (${wallets.length})`}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={tab === "wallet" ? Wallet : Landmark}
          title={tab === "wallet" ? "No wallets yet" : "No bank accounts yet"}
          hint={
            tab === "wallet"
              ? "Add PhonePe, Paytm or any wallet — you can reset its balance whenever it drifts."
              : "Add a bank account with its starting balance to begin tracking."
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const anchor = latestAnchor(anchors, a.id);
            return (
              <div key={a.id} className="surface-card flex items-center gap-3 p-4">
                <Link
                  to="/accounts/$accountId"
                  params={{ accountId: a.id }}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    {a.account_type === "wallet" ? (
                      <Wallet className="size-5" />
                    ) : (
                      <Landmark className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.bank_name || (a.account_type === "wallet" ? "Wallet" : "Bank account")}
                      {anchor ? ` · reset ${anchor.as_of_date}` : ""}
                    </p>
                  </div>
                  <p className="numeric shrink-0 font-display font-semibold">
                    {formatMoney(accountBalance(a.id, txns, anchor), currency)}
                  </p>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
                <button
                  onClick={() => {
                    void remove.mutateAsync(a.id).then(() => toast.success("Removed"));
                  }}
                  aria-label={`Delete ${a.name}`}
                  className="shrink-0 text-muted-foreground transition-colors active:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </MobileScreen>
  );
}
