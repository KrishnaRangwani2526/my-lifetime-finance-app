import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, SearchIcon } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { TransactionRow } from "@/components/ledger/TransactionRow";
import { useAccounts, useCards, useCategories, useProfile, useTransactions } from "@/hooks/useLedger";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search entries — MyLedger" },
      {
        name: "description",
        content: "Find any past transaction by note, merchant, category or amount.",
      },
      { property: "og:title", content: "Search entries — MyLedger" },
      {
        property: "og:description",
        content: "Find any past transaction by note, merchant, category or amount.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SearchScreen />
    </RequireAuth>
  ),
});

function SearchScreen() {
  const [term, setTerm] = useState("");
  const { data: profile } = useProfile();
  const { data: txns = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const currency = profile?.currency ?? "INR";

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name;
  const sourceName = (type: string, id: string | null) =>
    type === "card"
      ? cards.find((c) => c.id === id)?.name
      : accounts.find((a) => a.id === id)?.name;

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return txns
      .filter((t) =>
        [
          t.description,
          t.merchant,
          catName(t.category_id),
          sourceName(t.linked_type, t.linked_id),
          String(t.amount),
          t.txn_date,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q)),
      )
      .slice(0, 60);
  }, [term, txns, categories, accounts, cards]);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-4">
        <div className="mb-4 flex items-center gap-2">
          <Link
            to="/"
            aria-label="Back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search notes, merchants, amounts"
              autoFocus
              className="h-11 rounded-full pl-9"
            />
          </div>
        </div>

        {term.trim() === "" ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Type to search all your entries.
          </p>
        ) : results.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            No entries match “{term}”.
          </p>
        ) : (
          <div className="surface-card divide-y divide-border overflow-hidden">
            {results.map((t) => (
              <TransactionRow
                key={t.id}
                txn={t}
                currency={currency}
                categoryName={catName(t.category_id)}
                sourceName={sourceName(t.linked_type, t.linked_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
