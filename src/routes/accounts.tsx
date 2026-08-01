import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Landmark, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, MobileScreen, ScreenHeader } from "@/components/AppShell";
import { useAccounts, useDeleteRow, useProfile, useSaveRow, useTransactions } from "@/hooks/useLedger";
import { ACCOUNT_TYPES, accountBalance, formatMoney } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts & wallets — MyLedger" },
      {
        name: "description",
        content: "Track every bank account and wallet with a live balance built from your entries.",
      },
      { property: "og:title", content: "Accounts & wallets — MyLedger" },
      {
        property: "og:description",
        content: "Track every bank account and wallet with a live balance built from your entries.",
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
  const save = useSaveRow("bank_accounts");
  const remove = useDeleteRow("bank_accounts");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("bank");
  const [opening, setOpening] = useState("");

  const currency = profile?.currency ?? "INR";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give the account a name");
      return;
    }
    try {
      await save.mutateAsync({
        values: {
          name: name.trim(),
          account_type: type,
          opening_balance: Number(opening) || 0,
        },
      });
      toast.success("Account added");
      setName("");
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
        subtitle="Banks and wallets"
        action={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="size-10 shrink-0 rounded-full">
                <Plus className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>New account</SheetTitle>
              </SheetHeader>
              <form onSubmit={submit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-name">Name</Label>
                  <Input
                    id="acc-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="HDFC Savings"
                    className="h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t === "bank" ? "Bank account" : "Wallet"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-open">Opening balance</Label>
                  <Input
                    id="acc-open"
                    value={opening}
                    onChange={(e) => setOpening(e.target.value.replace(/[^0-9.]/g, ""))}
                    inputMode="decimal"
                    placeholder="0"
                    className="numeric h-12"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                  {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Add account
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No accounts yet"
          hint="Add a bank account or wallet to start tracking your balance."
        />
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <div key={a.id} className="surface-card flex items-center gap-3 p-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                {a.account_type === "wallet" ? (
                  <Wallet className="size-5" />
                ) : (
                  <Landmark className="size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{a.account_type}</p>
              </div>
              <div className="text-right">
                <p className="numeric font-display font-semibold">
                  {formatMoney(accountBalance(a.id, txns), currency)}
                </p>
              </div>
              <button
                onClick={() => {
                  void remove.mutateAsync(a.id).then(() => toast.success("Account removed"));
                }}
                aria-label={`Delete ${a.name}`}
                className="text-muted-foreground transition-colors active:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </MobileScreen>
  );
}
