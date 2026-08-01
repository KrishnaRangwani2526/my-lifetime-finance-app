import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Loader2, PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, MobileScreen, ScreenHeader } from "@/components/AppShell";
import {
  useAccounts,
  useCards,
  useDeleteRow,
  useEmis,
  useProfile,
  useSaveRow,
} from "@/hooks/useLedger";
import { formatMoney, num, todayISO } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/emis")({
  head: () => ({
    meta: [
      { title: "EMIs & loans — MyLedger" },
      {
        name: "description",
        content: "Track loan instalments, mark payments as done and see how much is left to pay.",
      },
      { property: "og:title", content: "EMIs & loans — MyLedger" },
      {
        property: "og:description",
        content: "Track loan instalments, mark payments as done and see how much is left to pay.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Emis />
    </RequireAuth>
  ),
});

function Emis() {
  const { data: profile } = useProfile();
  const { data: emis = [] } = useEmis();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const save = useSaveRow("emis");
  const remove = useDeleteRow("emis");
  const saveTxn = useSaveRow("transactions");

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState("12");
  const [target, setTarget] = useState("");

  const currency = profile?.currency ?? "INR";
  const options = [
    ...accounts.map((a) => ({ key: `account:${a.id}`, label: a.name })),
    ...cards.map((c) => ({ key: `card:${c.id}`, label: `${c.name} (card)` })),
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const monthly = Number(amount);
    if (!title.trim() || !Number.isFinite(monthly) || monthly <= 0) {
      toast.error("Add a title and monthly amount");
      return;
    }
    const [linkedType, linkedId] = (target || "account:").split(":");
    try {
      await save.mutateAsync({
        values: {
          title: title.trim(),
          monthly_amount: monthly,
          total_installments: Number(total) || 12,
          installments_paid: 0,
          start_date: todayISO(),
          linked_type: linkedType ?? "account",
          linked_id: linkedId || null,
        },
      });
      toast.success("EMI added");
      setTitle("");
      setAmount("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function payInstalment(id: string) {
    const emi = emis.find((e) => e.id === id);
    if (!emi) return;
    await save.mutateAsync({
      id,
      values: {
        installments_paid: Math.min(emi.installments_paid + 1, emi.total_installments),
      },
    });
    await saveTxn.mutateAsync({
      values: {
        linked_type: emi.linked_type,
        linked_id: emi.linked_id,
        amount: num(emi.monthly_amount),
        direction: "debit",
        txn_date: todayISO(),
        description: `${emi.title} instalment`,
        source: "emi",
      },
    });
    toast.success("Instalment recorded");
  }

  return (
    <MobileScreen>
      <ScreenHeader
        title="EMIs & loans"
        subtitle="Instalment tracking"
        action={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="size-10 shrink-0 rounded-full">
                <Plus className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>New EMI</SheetTitle>
              </SheetHeader>
              <form onSubmit={submit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="emi-title">Title</Label>
                  <Input
                    id="emi-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Bike loan"
                    className="h-12"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="emi-amount">Monthly</Label>
                    <Input
                      id="emi-amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      inputMode="decimal"
                      className="numeric h-12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emi-total">Instalments</Label>
                    <Input
                      id="emi-total"
                      value={total}
                      onChange={(e) => setTotal(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      className="numeric h-12"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Paid from</Label>
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
                  Add EMI
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      {emis.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No EMIs tracked"
          hint="Add a loan or instalment plan to see what's left to pay."
        />
      ) : (
        <div className="space-y-3">
          {emis.map((e) => {
            const paid = e.installments_paid;
            const pct = (paid / Math.max(e.total_installments, 1)) * 100;
            const left = Math.max(e.total_installments - paid, 0) * num(e.monthly_amount);
            const done = paid >= e.total_installments;
            return (
              <div key={e.id} className="surface-card p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {paid} of {e.total_installments} paid ·{" "}
                      {formatMoney(num(e.monthly_amount), currency)}/mo
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="numeric font-display font-semibold">
                      {formatMoney(left, currency, true)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">left</p>
                  </div>
                  <button
                    onClick={() => {
                      void remove.mutateAsync(e.id).then(() => toast.success("EMI removed"));
                    }}
                    aria-label={`Delete ${e.title}`}
                    className="text-muted-foreground transition-colors active:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <Progress value={pct} className="mt-3 h-2" />
                <Button
                  onClick={() => void payInstalment(e.id)}
                  disabled={done || save.isPending}
                  variant="secondary"
                  className="mt-3 w-full rounded-full"
                >
                  {done ? (
                    <>
                      <Check className="mr-1.5 size-4" /> Fully paid
                    </>
                  ) : (
                    "Mark this month paid"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </MobileScreen>
  );
}
