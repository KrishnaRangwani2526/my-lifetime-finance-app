import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, CreditCard, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, MobileScreen, ScreenHeader } from "@/components/AppShell";
import {
  latestAnchor,
  useAnchors,
  useCards,
  useDeleteRow,
  useProfile,
  useSaveRow,
  useTransactions,
} from "@/hooks/useLedger";
import { cardCycle, cardOutstanding, formatExactDate, formatMoney, num } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";


export const Route = createFileRoute("/cards")({
  head: () => ({
    meta: [
      { title: "Credit cards — MyLedger" },
      {
        name: "description",
        content: "Watch outstanding balances, limits used and the next bill date for every card.",
      },
      { property: "og:title", content: "Credit cards — MyLedger" },
      {
        property: "og:description",
        content: "Watch outstanding balances, limits used and the next bill date for every card.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Cards />
    </RequireAuth>
  ),
});

function Cards() {
  const { data: profile } = useProfile();
  const { data: cards = [] } = useCards();
  const { data: txns = [] } = useTransactions();
  const { data: anchors = [] } = useAnchors();

  const save = useSaveRow("card_accounts");
  const remove = useDeleteRow("card_accounts");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [billDate, setBillDate] = useState("1");
  const [dueDate, setDueDate] = useState("15");

  const currency = profile?.currency ?? "INR";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give the card a name");
      return;
    }
    try {
      await save.mutateAsync({
        values: {
          name: name.trim(),
          credit_limit: Number(limit) || 0,
          billing_date: Number(billDate) || 1,
          due_date: Number(dueDate) || 15,
        },
      });
      toast.success("Card added");
      setName("");
      setLimit("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <MobileScreen>
      <ScreenHeader
        title="Cards"
        subtitle="Credit cards and dues"
        action={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="size-10 shrink-0 rounded-full">
                <Plus className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>New card</SheetTitle>
              </SheetHeader>
              <form onSubmit={submit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="card-name">Name</Label>
                  <Input
                    id="card-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Amazon Pay ICICI"
                    className="h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="card-limit">Credit limit</Label>
                  <Input
                    id="card-limit"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value.replace(/[^0-9.]/g, ""))}
                    inputMode="decimal"
                    placeholder="100000"
                    className="numeric h-12"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bill-date">Bill day</Label>
                    <Input
                      id="bill-date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      className="numeric h-12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="due-date">Due day</Label>
                    <Input
                      id="due-date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      className="numeric h-12"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                  {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Add card
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No cards yet"
          hint="Add a credit card to track spends, limits and bill dates."
        />
      ) : (
        <div className="space-y-3">
          {cards.map((c) => {
            const anchor = latestAnchor(anchors, c.id);
            const owed = cardOutstanding(c.id, txns, anchor);
            const lim = num(c.credit_limit);
            const pct = lim > 0 ? Math.min((owed / lim) * 100, 100) : 0;
            const cycle = cardCycle(c.billing_date, c.due_date);
            return (
              <div key={c.id} className="surface-card p-4">
                <div className="flex items-start gap-3">
                  <Link
                    to="/cards/$cardId"
                    params={{ cardId: c.id }}
                    className="flex min-w-0 flex-1 items-start gap-3"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-accent">
                      <CreditCard className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Bills {formatExactDate(cycle.billing)} · due {formatExactDate(cycle.due)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="numeric font-display font-semibold text-debit">
                        {formatMoney(owed, currency)}
                      </p>
                      {lim > 0 && (
                        <p className="numeric text-[11px] text-muted-foreground">
                          of {formatMoney(lim, currency, true)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  </Link>
                  <button
                    onClick={() => {
                      void remove.mutateAsync(c.id).then(() => toast.success("Card removed"));
                    }}
                    aria-label={`Delete ${c.name}`}
                    className="shrink-0 text-muted-foreground transition-colors active:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {lim > 0 && <Progress value={pct} className="mt-3 h-2" />}
              </div>
            );
          })}
        </div>
      )}
    </MobileScreen>
  );
}

