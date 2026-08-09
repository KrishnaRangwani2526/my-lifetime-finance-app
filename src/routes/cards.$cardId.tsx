import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { LedgerDetail } from "@/components/ledger/LedgerDetail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  latestAnchor,
  useAnchors,
  useCards,
  useProfile,
  useSaveRow,
  useTransactions,
} from "@/hooks/useLedger";
import {
  cardCycle,
  cardOutstanding,
  formatExactDate,
  formatMoney,
  num,
  type CardAccount,
} from "@/lib/finance";

export const Route = createFileRoute("/cards/$cardId")({
  head: () => ({
    meta: [
      { title: "Card ledger — MyLedger" },
      {
        name: "description",
        content:
          "Outstanding, limit used, exact billing and due dates, EMIs and CSV sheets for this credit card.",
      },
      { property: "og:title", content: "Card ledger — MyLedger" },
      {
        property: "og:description",
        content:
          "Outstanding, limit used, exact billing and due dates, EMIs and CSV sheets for this credit card.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CardDetail />
    </RequireAuth>
  ),
});

function CardDetail() {
  const { cardId } = Route.useParams();
  const { data: profile } = useProfile();
  const { data: cards = [] } = useCards();
  const { data: txns = [] } = useTransactions();
  const { data: anchors = [] } = useAnchors();

  const card = cards.find((c) => c.id === cardId);
  const currency = profile?.currency ?? "INR";
  if (!card) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center text-sm text-muted-foreground">
        This card no longer exists.
      </div>
    );
  }

  const anchor = latestAnchor(anchors, card.id);
  const owed = cardOutstanding(card.id, txns, anchor);
  const creditLimit = num(card.credit_limit);
  const pct = creditLimit > 0 ? Math.min((owed / creditLimit) * 100, 100) : 0;
  const cycle = cardCycle(card.billing_date, card.due_date);
  const limit = card.spend_limit === null ? null : num(card.spend_limit);

  return (
    <LedgerDetail
      linkedType="card"
      linkedId={card.id}
      name={card.name}
      subtitle={[card.bank_name, card.last4 ? `•••• ${card.last4}` : ""].filter(Boolean).join(" · ") || "Credit card"}
      currency={currency}
      balance={owed}
      spendLimit={limit}
      editSheet={<EditCardSheet card={card} />}
      hero={
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="numeric font-display text-3xl font-semibold text-debit">
            {formatMoney(owed, currency)}
          </p>
          {creditLimit > 0 && (
            <>
              <Progress value={pct} className="mt-3 h-2" />
              <p className="numeric mt-1 text-[11px] text-muted-foreground">
                {formatMoney(owed, currency, true)} of {formatMoney(creditLimit, currency, true)}{" "}
                limit used · {formatMoney(Math.max(creditLimit - owed, 0), currency, true)} available
              </p>
            </>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2.5 text-sm">
            <div className="rounded-2xl bg-secondary/60 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Next billing date</p>
              <p className="text-sm font-semibold">{formatExactDate(cycle.billing)}</p>
            </div>
            <div className="rounded-2xl bg-secondary/60 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Payment due date</p>
              <p className="text-sm font-semibold">{formatExactDate(cycle.due)}</p>
            </div>
          </div>
          {anchor && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Counted from your reset of {formatMoney(num(anchor.balance_amount), currency)} on{" "}
              {formatExactDate(anchor.as_of_date)}
            </p>
          )}
        </div>
      }
    />
  );
}

function EditCardSheet({ card }: { card: CardAccount }) {
  const save = useSaveRow("card_accounts");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(card.name);
  const [bank, setBank] = useState(card.bank_name ?? "");
  const [last4, setLast4] = useState(card.last4 ?? "");
  const [creditLimit, setCreditLimit] = useState(card.credit_limit === null ? "" : String(num(card.credit_limit)));
  const [spend, setSpend] = useState(card.spend_limit === null ? "" : String(num(card.spend_limit)));
  const [billDay, setBillDay] = useState(String(card.billing_date));
  const [dueDay, setDueDay] = useState(String(card.due_date));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give the card a name");
      return;
    }
    try {
      await save.mutateAsync({
        id: card.id,
        values: {
          name: name.trim(),
          bank_name: bank.trim(),
          last4: last4.trim() || null,
          credit_limit: creditLimit.trim() === "" ? null : Number(creditLimit) || 0,
          spend_limit: spend.trim() === "" ? null : Number(spend) || 0,
          billing_date: Math.min(Math.max(Number(billDay) || 1, 1), 31),
          due_date: Math.min(Math.max(Number(dueDay) || 1, 1), 31),
        },
      });
      toast.success("Card updated");
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
          aria-label="Edit card details"
          className="size-10 shrink-0 rounded-full"
        >
          <Pencil className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Edit {card.name}</SheetTitle>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="ec-name">Name</Label>
            <Input id="ec-name" value={name} onChange={(e) => setName(e.target.value)} className="h-12" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ec-bank">Bank</Label>
              <Input id="ec-bank" value={bank} onChange={(e) => setBank(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-last4">Last 4 digits</Label>
              <Input
                id="ec-last4"
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                inputMode="numeric"
                className="numeric h-12"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ec-bill">Bill day</Label>
              <Input
                id="ec-bill"
                value={billDay}
                onChange={(e) => setBillDay(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className="numeric h-12"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-due">Due day</Label>
              <Input
                id="ec-due"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className="numeric h-12"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-credit">Credit limit</Label>
            <Input
              id="ec-credit"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              className="numeric h-12"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-spend">Maximum spend limit</Label>
            <Input
              id="ec-spend"
              value={spend}
              onChange={(e) => setSpend(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="20000"
              className="numeric h-12"
            />
            <p className="text-[11px] text-muted-foreground">
              Your own cap for the open period — separate from the bank&apos;s credit limit.
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
