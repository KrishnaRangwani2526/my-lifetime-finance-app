import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarSync, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, MobileScreen, ScreenHeader } from "@/components/AppShell";
import {
  useAccounts,
  useCards,
  useDeleteRow,
  useProfile,
  useRecurring,
  useSaveRow,
} from "@/hooks/useLedger";
import { FREQUENCIES, advanceDate, daysUntil, formatMoney, num, todayISO } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/recurring")({
  head: () => ({
    meta: [
      { title: "Recurring bills — MyLedger" },
      {
        name: "description",
        content: "Subscriptions, rent and salary on autopilot — log each cycle with one tap.",
      },
      { property: "og:title", content: "Recurring bills — MyLedger" },
      {
        property: "og:description",
        content: "Subscriptions, rent and salary on autopilot — log each cycle with one tap.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <RecurringScreen />
    </RequireAuth>
  ),
});

function RecurringScreen() {
  const { data: profile } = useProfile();
  const { data: rows = [] } = useRecurring();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const save = useSaveRow("recurring_transactions");
  const remove = useDeleteRow("recurring_transactions");
  const saveTxn = useSaveRow("transactions");

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState("debit");
  const [frequency, setFrequency] = useState("monthly");
  const [nextDate, setNextDate] = useState(todayISO());
  const [target, setTarget] = useState("");

  const currency = profile?.currency ?? "INR";
  const options = [
    ...accounts.map((a) => ({ key: `account:${a.id}`, label: a.name })),
    ...cards.map((c) => ({ key: `card:${c.id}`, label: `${c.name} (card)` })),
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!name.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error("Add a name and amount");
      return;
    }
    const [linkedType, linkedId] = (target || "account:").split(":");
    try {
      await save.mutateAsync({
        values: {
          name: name.trim(),
          amount: value,
          direction,
          frequency,
          next_date: nextDate,
          is_active: true,
          linked_type: linkedType ?? "account",
          linked_id: linkedId || null,
        },
      });
      toast.success("Recurring entry added");
      setName("");
      setAmount("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function logCycle(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    await saveTxn.mutateAsync({
      values: {
        linked_type: row.linked_type,
        linked_id: row.linked_id,
        amount: num(row.amount),
        direction: row.direction,
        txn_date: row.next_date,
        category_id: row.category_id,
        description: row.name,
        source: "recurring",
      },
    });
    await save.mutateAsync({
      id,
      values: { next_date: advanceDate(row.next_date, row.frequency) },
    });
    toast.success(`${row.name} logged`);
  }

  return (
    <MobileScreen>
      <ScreenHeader
        title="Recurring"
        subtitle="Bills and subscriptions"
        action={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="size-10 shrink-0 rounded-full">
                <Plus className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>New recurring entry</SheetTitle>
              </SheetHeader>
              <form onSubmit={submit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rec-name">Name</Label>
                  <Input
                    id="rec-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Netflix"
                    className="h-12"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rec-amount">Amount</Label>
                    <Input
                      id="rec-amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      inputMode="decimal"
                      className="numeric h-12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Direction</Label>
                    <Select value={direction} onValueChange={setDirection}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Money out</SelectItem>
                        <SelectItem value="credit">Money in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Frequency</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rec-next">Next date</Label>
                    <Input
                      id="rec-next"
                      type="date"
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Account</Label>
                  <Select value={target} onValueChange={setTarget}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Choose account or card" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((o) => (
                        <SelectItem key={o.key} value={o.key}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                  {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Add entry
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarSync}
          title="Nothing recurring"
          hint="Add rent, salary or a subscription and log each cycle with one tap."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const days = daysUntil(r.next_date);
            return (
              <div key={r.id} className="surface-card p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {r.frequency} ·{" "}
                      {days <= 0 ? "due now" : `in ${days} day${days === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <p
                    className={
                      "numeric font-display font-semibold " +
                      (r.direction === "credit" ? "text-credit" : "text-debit")
                    }
                  >
                    {formatMoney(num(r.amount), currency)}
                  </p>
                  <button
                    onClick={() => {
                      void remove.mutateAsync(r.id).then(() => toast.success("Removed"));
                    }}
                    aria-label={`Delete ${r.name}`}
                    className="text-muted-foreground transition-colors active:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    onClick={() => void logCycle(r.id)}
                    variant="secondary"
                    className="flex-1 rounded-full"
                    disabled={saveTxn.isPending}
                  >
                    Log this cycle
                  </Button>
                  <Switch
                    checked={r.is_active}
                    aria-label="Active"
                    onCheckedChange={(checked) => {
                      void save.mutateAsync({ id: r.id, values: { is_active: checked } });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MobileScreen>
  );
}
