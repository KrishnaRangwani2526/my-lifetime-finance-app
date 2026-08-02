import { useState } from "react";
import { Loader2, PiggyBank } from "lucide-react";
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
import { useSaveRow } from "@/hooks/useLedger";
import { todayISO } from "@/lib/finance";

/** Records an EMI against this account / card only. */
export function EmiSheet({
  linkedType,
  linkedId,
  ownerLabel,
}: {
  linkedType: "account" | "card";
  linkedId: string;
  ownerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState("12");
  const [start, setStart] = useState(todayISO());
  const save = useSaveRow("emis");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const monthly = Number(amount);
    if (!title.trim() || !Number.isFinite(monthly) || monthly <= 0) {
      toast.error("Add a title and monthly amount");
      return;
    }
    try {
      await save.mutateAsync({
        values: {
          title: title.trim(),
          monthly_amount: monthly,
          total_installments: Number(total) || 12,
          installments_paid: 0,
          start_date: start,
          linked_type: linkedType,
          linked_id: linkedId,
        },
      });
      toast.success(`EMI added to ${ownerLabel}`);
      setTitle("");
      setAmount("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-2xl">
          <PiggyBank className="size-4" />
          Add EMI
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>New EMI</SheetTitle>
          <SheetDescription>Saved against {ownerLabel}.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="emi-title">What is it for?</Label>
            <Input
              id="emi-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="iPhone EMI"
              className="h-12"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emi-amt">Monthly amount</Label>
              <Input
                id="emi-amt"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="4999"
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
            <Label htmlFor="emi-start">First instalment date</Label>
            <Input
              id="emi-start"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-12"
            />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Add EMI
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
