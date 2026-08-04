import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories, useSaveRow, useTemplates } from "@/hooks/useLedger";
import { formatMoney, num, todayISO, weekdayName } from "@/lib/finance";
import { cn } from "@/lib/utils";

/**
 * Quick entries scoped to one account / wallet / card. Tapping a saved entry
 * files the pre-filled amount against *this* account only; a new quick entry
 * created here is also saved against this account only.
 */
export function QuickEntrySheet({
  linkedType,
  linkedId,
  ownerLabel,
  currency,
}: {
  linkedType: "account" | "card";
  linkedId: string;
  ownerLabel: string;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"debit" | "credit">("debit");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayISO());

  const { data: templates = [] } = useTemplates();
  const { data: categories = [] } = useCategories();
  const saveTpl = useSaveRow("quick_entry_templates");
  const saveTxn = useSaveRow("transactions");

  const mine = templates.filter((t) => t.linked_id === linkedId);

  async function run(id: string) {
    const tpl = mine.find((t) => t.id === id);
    if (!tpl) return;
    await saveTxn.mutateAsync({
      values: {
        linked_type: linkedType,
        linked_id: linkedId,
        amount: num(tpl.amount),
        direction: tpl.direction,
        txn_date: date,
        category_id: tpl.category_id,
        description: tpl.description ?? tpl.name,
        source: "template",
      },
    });
    toast.success(`${tpl.name} added to ${ownerLabel}`);
    setOpen(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!name.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error("Add a name and amount");
      return;
    }
    try {
      await saveTpl.mutateAsync({
        values: {
          name: name.trim(),
          amount: value,
          direction,
          linked_type: linkedType,
          linked_id: linkedId,
          category_id: categoryId || null,
          is_favorite: true,
        },
      });
      // Saving a brand-new quick entry also records it right away.
      await saveTxn.mutateAsync({
        values: {
          linked_type: linkedType,
          linked_id: linkedId,
          amount: value,
          direction,
          txn_date: date,
          category_id: categoryId || null,
          description: name.trim(),
          source: "template",
        },
      });
      toast.success("Quick entry saved and recorded");
      setName("");
      setAmount("");
      setCreating(false);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-2xl">
          <Zap className="size-4" />
          Quick entry
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Quick entry</SheetTitle>
          <SheetDescription>Pre-filled amounts saved for {ownerLabel}.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor={`qe-date-${linkedId}`}>Entry date</Label>
            <Input
              id={`qe-date-${linkedId}`}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-11"
            />
            <p className="text-xs font-medium text-muted-foreground">{weekdayName(date)}</p>
          </div>
          {mine.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {mine.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => void run(tpl.id)}
                  disabled={saveTxn.isPending}
                  className="surface-card px-3.5 py-3 text-left active:scale-[0.98]"
                >
                  <p className="truncate text-sm font-medium">{tpl.name}</p>
                  <p
                    className={cn(
                      "numeric text-sm font-semibold",
                      tpl.direction === "credit" ? "text-credit" : "text-debit",
                    )}
                  >
                    {tpl.direction === "credit" ? "+" : "−"}
                    {formatMoney(num(tpl.amount), currency)}
                  </p>
                </button>
              ))}
            </div>
          )}

          {mine.length === 0 && !creating && (
            <p className="text-sm text-muted-foreground">
              No quick entries for {ownerLabel} yet — create one now and it saves here only.
            </p>
          )}

          {creating ? (
            <form onSubmit={create} className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
                {(["debit", "credit"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    className={cn(
                      "rounded-full py-2 text-xs font-semibold",
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
              <div className="space-y-1.5">
                <Label htmlFor="qe-name">Name</Label>
                <Input
                  id="qe-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Morning chai"
                  className="h-12"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qe-amt">Fixed amount</Label>
                <Input
                  id="qe-amt"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  placeholder="20"
                  className="numeric h-12"
                />
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
              <Button type="submit" className="w-full rounded-full" disabled={saveTpl.isPending}>
                {saveTpl.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save &amp; record
              </Button>
            </form>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setCreating(true)}
              className="w-full rounded-2xl text-primary"
            >
              + New quick entry for {ownerLabel}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
