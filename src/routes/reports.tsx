import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { MobileScreen, ScreenHeader } from "@/components/AppShell";
import { useCategories, useProfile, useTransactions } from "@/hooks/useLedger";
import { formatMoney, monthLabel, num } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — MyLedger" },
      {
        name: "description",
        content: "Month-by-month trends and a category breakdown of where your money actually goes.",
      },
      { property: "og:title", content: "Reports — MyLedger" },
      {
        property: "og:description",
        content: "Month-by-month trends and a category breakdown of where your money actually goes.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Reports />
    </RequireAuth>
  ),
});

function Reports() {
  const { data: profile } = useProfile();
  const { data: txns = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const [range, setRange] = useState<3 | 6 | 12>(6);
  const currency = profile?.currency ?? "INR";

  const months = useMemo(() => {
    const list: { key: string; label: string; income: number; spend: number }[] = [];
    const now = new Date();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const rows = txns.filter((t) => t.txn_date.startsWith(key));
      list.push({
        key,
        label: monthLabel(`${key}-01`),
        income: rows.filter((r) => r.direction === "credit").reduce((s, r) => s + num(r.amount), 0),
        spend: rows.filter((r) => r.direction === "debit").reduce((s, r) => s + num(r.amount), 0),
      });
    }
    return list;
  }, [txns, range]);

  const peak = Math.max(1, ...months.map((m) => Math.max(m.income, m.spend)));
  const windowStart = months[0]?.key ?? "";
  const inWindow = txns.filter((t) => t.txn_date.slice(0, 7) >= windowStart);
  const totalSpend = inWindow
    .filter((t) => t.direction === "debit")
    .reduce((s, t) => s + num(t.amount), 0);
  const totalIncome = inWindow
    .filter((t) => t.direction === "credit")
    .reduce((s, t) => s + num(t.amount), 0);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of inWindow) {
      if (t.direction !== "debit") continue;
      const key = t.category_id ?? "none";
      map.set(key, (map.get(key) ?? 0) + num(t.amount));
    }
    return [...map.entries()]
      .map(([id, total]) => ({
        id,
        name: categories.find((c) => c.id === id)?.name ?? "Uncategorised",
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [inWindow, categories]);

  return (
    <MobileScreen>
      <ScreenHeader title="Reports" subtitle="Where your money goes" />

      <div className="mb-4 grid grid-cols-3 gap-1 rounded-full bg-secondary p-1">
        {([3, 6, 12] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "rounded-full py-2 text-xs font-semibold transition-colors",
              range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {r} months
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="surface-card p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5 text-credit" /> Total in
          </div>
          <p className="numeric font-display text-lg font-semibold text-credit">
            {formatMoney(totalIncome, currency, true)}
          </p>
        </div>
        <div className="surface-card p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingDown className="size-3.5 text-debit" /> Total out
          </div>
          <p className="numeric font-display text-lg font-semibold text-debit">
            {formatMoney(totalSpend, currency, true)}
          </p>
        </div>
      </div>

      <section className="surface-card mt-4 p-4">
        <h2 className="mb-4 font-display text-sm font-semibold">Monthly trend</h2>
        <div className="flex h-40 items-end justify-between gap-2">
          {months.map((m) => (
            <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-32 w-full items-end justify-center gap-1">
                <span
                  className="w-1/2 rounded-t-md bg-credit/80"
                  style={{ height: `${Math.max((m.income / peak) * 100, 2)}%` }}
                  title={`In ${formatMoney(m.income, currency)}`}
                />
                <span
                  className="w-1/2 rounded-t-md bg-debit/80"
                  style={{ height: `${Math.max((m.spend / peak) * 100, 2)}%` }}
                  title={`Out ${formatMoney(m.spend, currency)}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-credit" /> Money in
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-debit" /> Money out
          </span>
        </div>
      </section>

      <section className="surface-card mt-4 divide-y divide-border overflow-hidden">
        <h2 className="px-4 pb-3 pt-4 font-display text-sm font-semibold">Spend by category</h2>
        {byCategory.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No spending recorded in this range.
          </p>
        ) : (
          byCategory.map((c) => {
            const pct = totalSpend > 0 ? (c.total / totalSpend) * 100 : 0;
            return (
              <div key={c.id} className="px-4 py-3">
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="numeric shrink-0 pl-2">
                    {formatMoney(c.total, currency, true)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{pct.toFixed(0)}% of spend</p>
              </div>
            );
          })
        )}
      </section>
    </MobileScreen>
  );
}
