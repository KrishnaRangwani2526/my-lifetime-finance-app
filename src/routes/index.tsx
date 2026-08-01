import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  Landmark,
  Plus,
  Receipt,
  Search,
  Wallet,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { MobileScreen } from "@/components/AppShell";
import { SectionTitle, StatTile, TransactionRow } from "@/components/ledger/TransactionRow";
import {
  useAccounts,
  useCards,
  useCategories,
  useEmis,
  useProfile,
  useRecurring,
  useTemplates,
  useTransactions,
  useSaveRow,
} from "@/hooks/useLedger";
import {
  accountBalance,
  cardOutstanding,
  daysUntil,
  formatMoney,
  monthStartISO,
  nextDueDate,
  num,
  todayISO,
} from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MyLedger — Your money at a glance" },
      {
        name: "description",
        content:
          "See your total balance, this month's spending, upcoming card dues and EMIs in one mobile dashboard.",
      },
      { property: "og:title", content: "MyLedger — Your money at a glance" },
      {
        property: "og:description",
        content:
          "See your total balance, this month's spending, upcoming card dues and EMIs in one mobile dashboard.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

function Dashboard() {
  const { data: profile } = useProfile();
  const { data: txns = [] } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const { data: categories = [] } = useCategories();
  const { data: emis = [] } = useEmis();
  const { data: recurring = [] } = useRecurring();
  const { data: templates = [] } = useTemplates();
  const saveTxn = useSaveRow("transactions");

  const currency = profile?.currency ?? "INR";
  const monthStart = monthStartISO();
  const thisMonth = txns.filter((t) => t.txn_date >= monthStart);

  const income = thisMonth
    .filter((t) => t.direction === "credit")
    .reduce((s, t) => s + num(t.amount), 0);
  const spent = thisMonth
    .filter((t) => t.direction === "debit")
    .reduce((s, t) => s + num(t.amount), 0);

  const totalBalance = accounts.reduce((s, a) => s + accountBalance(a.id, txns), 0);
  const totalOwed = cards.reduce((s, c) => s + cardOutstanding(c.id, txns), 0);
  const netWorth = totalBalance - totalOwed;
  const budget = num(profile?.monthly_budget);
  const budgetPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  const upcoming = [
    ...cards.map((c) => ({
      id: c.id,
      title: `${c.name} bill`,
      date: nextDueDate(c.due_date),
      amount: cardOutstanding(c.id, txns),
      kind: "card" as const,
    })),
    ...emis
      .filter((e) => e.installments_paid < e.total_installments)
      .map((e) => ({
        id: e.id,
        title: e.title,
        date: e.end_date ?? todayISO(),
        amount: num(e.monthly_amount),
        kind: "emi" as const,
      })),
    ...recurring
      .filter((r) => r.is_active)
      .map((r) => ({
        id: r.id,
        title: r.name,
        date: r.next_date,
        amount: num(r.amount),
        kind: "recurring" as const,
      })),
  ]
    .filter((u) => u.amount > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const favorites = templates.filter((t) => t.is_favorite).slice(0, 4);
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name;
  const sourceName = (type: string, id: string | null) =>
    type === "card"
      ? cards.find((c) => c.id === id)?.name
      : accounts.find((a) => a.id === id)?.name;

  async function runTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    await saveTxn.mutateAsync({
      values: {
        linked_type: tpl.linked_type,
        linked_id: tpl.linked_id,
        amount: num(tpl.amount),
        direction: tpl.direction,
        txn_date: todayISO(),
        category_id: tpl.category_id,
        description: tpl.description ?? tpl.name,
        source: "template",
      },
    });
    toast.success(`${tpl.name} added`);
  }

  return (
    <MobileScreen>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="font-display text-xl font-semibold">
            Hi {profile?.display_name ?? "there"}
          </h1>
        </div>
        <Link
          to="/search"
          aria-label="Search transactions"
          className="flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground"
        >
          <Search className="size-5" />
        </Link>
      </header>

      <section className="hero-gradient rounded-3xl border border-border p-5 shadow-[var(--shadow-card)]">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Net position
        </p>
        <p className="numeric font-display text-4xl font-semibold">
          {formatMoney(netWorth, currency)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-background/40 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">In accounts</p>
            <p className="numeric font-semibold text-credit">
              {formatMoney(totalBalance, currency)}
            </p>
          </div>
          <div className="rounded-2xl bg-background/40 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Card dues</p>
            <p className="numeric font-semibold text-debit">{formatMoney(totalOwed, currency)}</p>
          </div>
        </div>

        {budget > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-muted-foreground">Monthly budget</span>
              <span className="numeric">
                {formatMoney(spent, currency, true)} / {formatMoney(budget, currency, true)}
              </span>
            </div>
            <Progress value={budgetPct} className="h-2" />
          </div>
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile
          label="Money in (month)"
          value={formatMoney(income, currency, true)}
          icon={ArrowDownLeft}
          tone="credit"
        />
        <StatTile
          label="Money out (month)"
          value={formatMoney(spent, currency, true)}
          icon={ArrowUpRight}
          tone="debit"
        />
      </div>

      {favorites.length > 0 && (
        <>
          <SectionTitle>One-tap entries</SectionTitle>
          <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {favorites.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => void runTemplate(tpl.id)}
                disabled={saveTxn.isPending}
                className="surface-card min-w-[9.5rem] shrink-0 px-3.5 py-3 text-left active:scale-[0.98]"
              >
                <p className="truncate text-sm font-medium">{tpl.name}</p>
                <p
                  className={
                    "numeric text-sm font-semibold " +
                    (tpl.direction === "credit" ? "text-credit" : "text-debit")
                  }
                >
                  {tpl.direction === "credit" ? "+" : "−"}
                  {formatMoney(num(tpl.amount), currency)}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      {(accounts.length > 0 || cards.length > 0) && (
        <>
          <SectionTitle
            action={
              <Link to="/accounts" className="text-xs font-medium text-primary">
                Manage
              </Link>
            }
          >
            Accounts &amp; cards
          </SectionTitle>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {accounts.map((a) => (
              <Link
                key={a.id}
                to="/accounts"
                className="surface-card min-w-[10.5rem] shrink-0 p-4"
              >
                <span className="mb-2 flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
                  {a.account_type === "wallet" ? (
                    <Wallet className="size-4" />
                  ) : (
                    <Landmark className="size-4" />
                  )}
                </span>
                <p className="truncate text-sm font-medium">{a.name}</p>
                <p className="numeric text-base font-semibold">
                  {formatMoney(accountBalance(a.id, txns), currency)}
                </p>
              </Link>
            ))}
            {cards.map((c) => (
              <Link key={c.id} to="/cards" className="surface-card min-w-[10.5rem] shrink-0 p-4">
                <span className="mb-2 flex size-8 items-center justify-center rounded-lg bg-secondary text-accent">
                  <CreditCard className="size-4" />
                </span>
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="numeric text-base font-semibold text-debit">
                  {formatMoney(cardOutstanding(c.id, txns), currency)}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <SectionTitle>Coming up</SectionTitle>
          <div className="surface-card divide-y divide-border overflow-hidden">
            {upcoming.map((u) => {
              const days = daysUntil(u.date);
              return (
                <div key={`${u.kind}-${u.id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-accent">
                    <CalendarClock className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {days <= 0 ? "Due now" : `in ${days} day${days === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <p className="numeric text-sm font-semibold">
                    {formatMoney(u.amount, currency)}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      <SectionTitle
        action={
          <Link to="/transactions" className="text-xs font-medium text-primary">
            See all
          </Link>
        }
      >
        Recent activity
      </SectionTitle>

      {txns.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Receipt className="size-6" />
          </span>
          <p className="font-display text-base font-medium">No entries yet</p>
          <p className="max-w-[26ch] text-sm text-muted-foreground">
            Add your first account, then log a transaction to see your balance build up.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="secondary" className="rounded-full">
              <Link to="/accounts">Add account</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/add">
                <Plus className="mr-1 size-4" /> Add entry
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="surface-card divide-y divide-border overflow-hidden">
          {txns.slice(0, 8).map((t) => (
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
    </MobileScreen>
  );
}
