import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Plus, Star, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, MobileScreen, ScreenHeader } from "@/components/AppShell";
import {
  useAccounts,
  useCards,
  useCategories,
  useDeleteRow,
  useProfile,
  useSaveRow,
  useTemplates,
} from "@/hooks/useLedger";
import { formatMoney, num, todayISO, weekdayName } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Quick entries — MyLedger" },
      {
        name: "description",
        content: "Save the entries you repeat daily and add them from the home screen in one tap.",
      },
      { property: "og:title", content: "Quick entries — MyLedger" },
      {
        property: "og:description",
        content: "Save the entries you repeat daily and add them from the home screen in one tap.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Templates />
    </RequireAuth>
  ),
});

function Templates() {
  const { data: profile } = useProfile();
  const { data: templates = [] } = useTemplates();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const { data: categories = [] } = useCategories();
  const save = useSaveRow("quick_entry_templates");
  const remove = useDeleteRow("quick_entry_templates");
  const saveTxn = useSaveRow("transactions");

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState("debit");
  const [target, setTarget] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayISO());

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
    if (!target) {
      toast.error("Choose the account, wallet or card for this quick entry");
      return;
    }
    const [linkedType, linkedId] = target.split(":");
    try {
      await save.mutateAsync({
        values: {
          name: name.trim(),
          amount: value,
          direction,
          linked_type: linkedType ?? "account",
          linked_id: linkedId || null,
          category_id: categoryId || null,
          is_favorite: true,
        },
      });
      toast.success("Quick entry saved");
      setName("");
      setAmount("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function run(id: string) {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    await saveTxn.mutateAsync({
      values: {
        linked_type: tpl.linked_type,
        linked_id: tpl.linked_id,
        amount: num(tpl.amount),
        direction: tpl.direction,
        txn_date: date,
        category_id: tpl.category_id,
        description: tpl.description ?? tpl.name,
        source: "template",
      },
    });
    toast.success(`${tpl.name} added`);
  }

  return (
    <MobileScreen>
      <ScreenHeader
        title="Quick entries"
        subtitle="One-tap favourites"
        action={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="size-10 shrink-0 rounded-full">
                <Plus className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>New quick entry</SheetTitle>
              </SheetHeader>
              <form onSubmit={submit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-name">Name</Label>
                  <Input
                    id="tpl-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Morning chai"
                    className="h-12"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-amount">Amount</Label>
                    <Input
                      id="tpl-amount"
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
                <div className="space-y-1.5">
                  <Label>Linked account, wallet or card</Label>
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
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Uncategorised" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                  {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save quick entry
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No quick entries"
          hint="Save entries you repeat often, then add them from home in one tap."
        />
      ) : (
        <div className="space-y-3">
          <div className="surface-card p-3">
            <Label htmlFor="quick-date">Entry date</Label>
            <Input
              id="quick-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1.5 h-11"
            />
            <p className="mt-1 text-xs font-medium text-muted-foreground">{weekdayName(date)}</p>
          </div>
          {templates.map((t) => (
            <div key={t.id} className="surface-card flex items-center gap-3 p-4">
              <button
                onClick={() => {
                  void save.mutateAsync({ id: t.id, values: { is_favorite: !t.is_favorite } });
                }}
                aria-label="Toggle favourite"
                className={cn(t.is_favorite ? "text-accent" : "text-muted-foreground")}
              >
                <Star className={cn("size-5", t.is_favorite && "fill-current")} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.name}</p>
                <p
                  className={
                    "numeric text-sm " +
                    (t.direction === "credit" ? "text-credit" : "text-muted-foreground")
                  }
                >
                  {formatMoney(num(t.amount), currency)}
                </p>
              </div>
              <Button
                onClick={() => void run(t.id)}
                variant="secondary"
                className="rounded-full"
                disabled={saveTxn.isPending}
              >
                Add now
              </Button>
              <button
                onClick={() => {
                  void remove.mutateAsync(t.id).then(() => toast.success("Removed"));
                }}
                aria-label={`Delete ${t.name}`}
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
