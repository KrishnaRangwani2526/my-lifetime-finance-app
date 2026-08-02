import { useMemo, useRef, useState } from "react";
import { FileUp, Loader2, Trash2 } from "lucide-react";
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
import { analyseStatement, parseDelimited, type StatementAnalysis } from "@/lib/csv";
import { formatMoney } from "@/lib/finance";
import { useBulkInsertTransactions, useClearImported } from "@/hooks/useLedger";

export function ImportStatementSheet({
  linkedType,
  linkedId,
  ownerLabel,
  currency,
  hasImported,
}: {
  linkedType: "account" | "card";
  linkedId: string;
  ownerLabel: string;
  currency: string;
  hasImported: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [analysis, setAnalysis] = useState<StatementAnalysis | null>(null);
  const [fileName, setFileName] = useState("");
  const [month, setMonth] = useState("");
  const [forceMonth, setForceMonth] = useState(false);
  const [reading, setReading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bulk = useBulkInsertTransactions();
  const clear = useClearImported();

  const rows = useMemo(() => {
    if (!analysis) return [];
    if (!forceMonth || !month) return analysis.rows;
    return analysis.rows.map((r) => ({ ...r, date: `${month}-${r.date.slice(8, 10)}` }));
  }, [analysis, forceMonth, month]);

  const monthsFound = useMemo(
    () => [...new Set(rows.map((r) => r.date.slice(0, 7)))].sort(),
    [rows],
  );

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setFileName(file.name);
    try {
      const text = await file.text();
      const grid = parseDelimited(text);
      const result = analyseStatement(grid, month || undefined);
      if (result.rows.length === 0) {
        toast.error("Could not find any transactions in that file");
        setAnalysis(null);
      } else {
        setAnalysis(result);
        toast.success(`${result.rows.length} entries read`);
      }
    } catch {
      toast.error("Could not read that file");
    } finally {
      setReading(false);
    }
  }

  async function confirm() {
    if (rows.length === 0) return;
    try {
      const count = await bulk.mutateAsync(
        rows.map((r) => ({
          linked_type: linkedType,
          linked_id: linkedId,
          amount: r.amount,
          direction: r.direction,
          txn_date: r.date,
          description: r.description,
          merchant: null,
          category_id: null,
          source: "statement",
        })),
      );
      toast.success(`${count} statement entries imported`);
      setAnalysis(null);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-2xl">
          <FileUp className="size-4" />
          Import statement
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Import statement</SheetTitle>
          <SheetDescription>
            {ownerLabel} — upload a CSV or text statement. MyLedger reads the dates, amounts and
            narration, works out money in vs money out, and files it month-wise.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="stmt-file">Statement file (.csv / .txt / .tsv)</Label>
            <Input
              id="stmt-file"
              ref={inputRef}
              type="file"
              accept=".csv,.txt,.tsv,text/csv,text/plain"
              onChange={(e) => void onFile(e.target.files?.[0])}
              className="h-12 py-2.5"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stmt-month">Which month is this statement?</Label>
            <Input
              id="stmt-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-12"
            />
            <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={forceMonth}
                onChange={(e) => setForceMonth(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              File every row under this month (use for old statements without a year)
            </label>
          </div>

          {reading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Reading {fileName}…
            </p>
          )}

          {analysis && rows.length > 0 && (
            <div className="surface-card space-y-3 p-4">
              <p className="text-sm font-medium">{rows.length} entries ready</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-secondary px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Money in</p>
                  <p className="numeric font-semibold text-credit">
                    {formatMoney(
                      rows.filter((r) => r.direction === "credit").reduce((s, r) => s + r.amount, 0),
                      currency,
                      true,
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-secondary px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Money out</p>
                  <p className="numeric font-semibold text-debit">
                    {formatMoney(
                      rows.filter((r) => r.direction === "debit").reduce((s, r) => s + r.amount, 0),
                      currency,
                      true,
                    )}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Months detected: {monthsFound.join(", ")}
                {analysis.skipped > 0 && ` · ${analysis.skipped} non-transaction lines ignored`}
              </p>
              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {rows.slice(0, 12).map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-muted-foreground">
                      {r.date} · {r.description}
                    </span>
                    <span
                      className={
                        "numeric shrink-0 font-medium " +
                        (r.direction === "credit" ? "text-credit" : "text-debit")
                      }
                    >
                      {r.direction === "credit" ? "+" : "−"}
                      {r.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => void confirm()}
                disabled={bulk.isPending}
                className="w-full rounded-full"
              >
                {bulk.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Import {rows.length} entries
              </Button>
            </div>
          )}

          {hasImported && (
            <Button
              variant="ghost"
              onClick={() => {
                void clear
                  .mutateAsync({ linkedId })
                  .then(() => toast.success("Imported statement rows removed"));
              }}
              disabled={clear.isPending}
              className="h-11 w-full gap-2 rounded-2xl text-destructive"
            >
              <Trash2 className="size-4" />
              Remove previously imported statement rows
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
