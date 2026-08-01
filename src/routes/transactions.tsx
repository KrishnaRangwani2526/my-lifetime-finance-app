import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Filter, Receipt } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { MobileScreen } from "@/components/AppShell";
import { TransactionRow } from "@/components/ledger/TransactionRow";
import { useAccounts, useCards, useCategories, useProfile, useTransactions } from "@/hooks/useLedger";
import { formatMonthLabel, formatMoney, num } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Activity — MyLedger" },
      {
        name: "description",
        content: "Every transaction grouped by month, with running totals for money in and out.",
      },
      { property: "og:title", content: "Activity — MyLedger" },
      {
        property: "og:description",
        content: "Every transaction grouped by month, with running totals for money in and out.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Activity />
    </RequireAuth>
  ),
});

type FilterKind = "all" | "credit" | "debit";

function Activity() {
  const { data: profile } = useProfile();
  const { data: txns = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const [filter, setFilter] = useState<FilterKind>("all");
  const [categoryId, setCategoryId] = useState<string>("all");

  const currency = profile?.currency ?? "INR";

  const filtered = useMemo(
    () =>
      txns.filter(
        (t) =>
          (filter === "all" || t.direction === filter) &&
          (categoryId === "all" || t.category_id === categoryId),
      ),
    [txns, filter, categoryId],
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const key = t.txn_date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name;
  const sourceName = (type: string, id: string | null) =>
    type === "card"
      ? cards.find((c) => c.id === id)?.name
      : accounts.find((a) => a.id === id)?.name;

  return (
    <MobileScreen>
      <h1 className="font-display text-xl font-semibold">Activity</h1>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {(
          [
            ["all", "All"],
            ["debit", "Money out"],
            ["credit", "Money in"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              filter === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 w-px shrink-0 bg-border" />
        <button
          onClick={() => setCategoryId("all")}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-medium",
            categoryId === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-secondary text-muted-foreground",
          )}
        >
          <Filter className="size-3" /> Any category
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium",
              categoryId === c.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-muted-foreground",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="surface-card mt-6 flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Receipt className="size-6" />
          </span>
          <p className="font-display text-base font-medium">Nothing here yet</p>
          <p className="text-sm text-muted-foreground">
            Entries you add will show up grouped by month.
          </p>
        </div>
      ) : (
        groups.map(([month, rows]) => {
          const inSum = rows
            .filter((r) => r.direction === "credit")
            .reduce((s, r) => s + num(r.amount), 0);
          const outSum = rows
            .filter((r) => r.direction === "debit")
            .reduce((s, r) => s + num(r.amount), 0);
          return (
            <section key={month} className="mt-6">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-display text-sm font-semibold">{formatMonthLabel(month)}</h2>
                <p className="numeric text-xs">
                  <span className="text-credit">+{formatMoney(inSum, currency, true)}</span>
                  <span className="mx-1 text-muted-foreground">/</span>
                  <span className="text-debit">−{formatMoney(outSum, currency, true)}</span>
                </p>
              </div>
              <div className="surface-card divide-y divide-border overflow-hidden">
                {rows.map((t) => (
                  <TransactionRow
                    key={t.id}
                    txn={t}
                    currency={currency}
                    categoryName={catName(t.category_id)}
                    sourceName={sourceName(t.linked_type, t.linked_id)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </MobileScreen>
  );
}
