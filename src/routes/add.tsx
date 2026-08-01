import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import {
  useAccounts,
  useCards,
  useCategories,
  useDeleteRow,
  useProfile,
  useSaveRow,
  useTransactions,
} from "@/hooks/useLedger";
import { currencyMeta, num, todayISO, type Direction } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/add")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search["id"] === "string" ? search["id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Add an entry — MyLedger" },
      {
        name: "description",
        content: "Log money in or money out against any bank account, wallet or credit card.",
      },
      { property: "og:title", content: "Add an entry — MyLedger" },
      {
        property: "og:description",
        content: "Log money in or money out against any bank account, wallet or credit card.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AddEntry />
    </RequireAuth>
  ),
});

function AddEntry() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const { data: categories = [] } = useCategories();
  const { data: txns = [] } = useTransactions();
  const save = useSaveRow("transactions");
  const remove = useDeleteRow("transactions");

  const existing = useMemo(() => txns.find((t) => t.id === id), [txns, id]);
  const symbol = currencyMeta(profile?.currency).symbol;

  const [direction, setDirection] = useState<Direction>("debit");
  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");

  const options = useMemo(
    () => [
      ...accounts.map((a) => ({ key: `account:${a.id}`, label: `${a.name} · ${a.account_type}` })),
      ...cards.map((c) => ({ key: `card:${c.id}`, label: `${c.name} · card` })),
    ],
    [accounts, cards],
  );

  useEffect(() => {
    if (existing) {
      setDirection(existing.direction === "credit" ? "credit" : "debit");
      setAmount(String(num(existing.amount)));
      setTarget(`${existing.linked_type}:${existing.linked_id ?? ""}`);
      setCategoryId(existing.category_id ?? "");
      setDate(existing.txn_date);
      setDescription(existing.description ?? "");
      setMerchant(existing.merchant ?? "");
    } else if (!target && options[0]) {
      setTarget(options[0].key);
    }
  }, [existing, options, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!target) {
      toast.error("Add an account or card first");
      return;
    }
    const [linkedType, linkedId] = target.split(":");
    try {
      await save.mutateAsync({
        ...(id ? { id } : {}),
        values: {
          linked_type: linkedType ?? "account",
          linked_id: linkedId ?? null,
          amount: value,
          direction,
          txn_date: date,
          category_id: categoryId || null,
          description: description || null,
          merchant: merchant || null,
          source: existing?.source ?? "manual",
        },
      });
      toast.success(id ? "Entry updated" : "Entry saved");
      void navigate({ to: "/transactions" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function destroy() {
    if (!id) return;
    await remove.mutateAsync(id);
    toast.success("Entry deleted");
    void navigate({ to: "/transactions" });
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => void navigate({ to: "/" })}
            className="flex size-10 items-center justify-center rounded-full bg-secondary"
            aria-label="Back"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">{id ? "Edit entry" : "New entry"}</h1>
          {id ? (
            <button
              onClick={() => void destroy()}
              className="flex size-10 items-center justify-center rounded-full bg-secondary text-destructive"
              aria-label="Delete entry"
            >
              <Trash2 className="size-5" />
            </button>
          ) : (
            <span className="size-10" />
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
            {(["debit", "credit"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={cn(
                  "rounded-full py-2.5 text-sm font-semibold transition-colors",
                  direction === d
                    ? d === "credit"
                      ? "bg-credit text-credit-foreground"
                      : "bg-debit text-debit-foreground"
                    : "text-muted-foreground",
                )}
              >
                {d === "credit" ? "Money in" : "Money out"}
              </button>
            ))}
          </div>

          <div className="hero-gradient rounded-3xl border border-border p-5 text-center">
            <Label htmlFor="amount" className="text-xs text-muted-foreground">
              Amount
            </Label>
            <div className="mt-1 flex items-center justify-center gap-1">
              <span className="font-display text-2xl text-muted-foreground">{symbol}</span>
              <input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                autoFocus={!id}
                className="numeric w-full max-w-[8ch] bg-transparent text-center font-display text-4xl font-semibold outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Paid from / into</Label>
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
            {options.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No accounts yet — add one from Accounts.
              </p>
            )}
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

          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Input
              id="note"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lunch with team"
              className="h-12"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="merchant">Merchant (optional)</Label>
            <Input
              id="merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Swiggy"
              className="h-12"
            />
          </div>

          <Button
            type="submit"
            className="h-13 w-full rounded-full py-4 text-base"
            disabled={save.isPending}
          >
            {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {id ? "Save changes" : "Add entry"}
          </Button>
        </form>
      </div>
    </div>
  );
}
