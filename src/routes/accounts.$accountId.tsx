import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { LedgerDetail } from "@/components/ledger/LedgerDetail";
import {
  latestAnchor,
  useAccounts,
  useAnchors,
  useProfile,
  useTransactions,
} from "@/hooks/useLedger";
import { accountBalance, formatExactDate, formatMoney } from "@/lib/finance";

export const Route = createFileRoute("/accounts/$accountId")({
  head: () => ({
    meta: [
      { title: "Account ledger — MyLedger" },
      {
        name: "description",
        content: "Entries, EMIs, statement imports and month-wise CSV sheets for this account.",
      },
      { property: "og:title", content: "Account ledger — MyLedger" },
      {
        property: "og:description",
        content: "Entries, EMIs, statement imports and month-wise CSV sheets for this account.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AccountDetail />
    </RequireAuth>
  ),
});

function AccountDetail() {
  const { accountId } = Route.useParams();
  const { data: profile } = useProfile();
  const { data: accounts = [] } = useAccounts();
  const { data: txns = [] } = useTransactions();
  const { data: anchors = [] } = useAnchors();

  const account = accounts.find((a) => a.id === accountId);
  const currency = profile?.currency ?? "INR";
  if (!account) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center text-sm text-muted-foreground">
        This account no longer exists.
      </div>
    );
  }

  const anchor = latestAnchor(anchors, account.id);
  const balance = accountBalance(account.id, txns, anchor);
  const isWallet = account.account_type === "wallet";

  return (
    <LedgerDetail
      linkedType="account"
      linkedId={account.id}
      name={account.name}
      subtitle={account.bank_name || (isWallet ? "Wallet" : "Bank account")}
      currency={currency}
      resettable
      hero={
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">
            {isWallet ? "Wallet balance" : "Account balance"}
          </p>
          <p className="numeric font-display text-3xl font-semibold">
            {formatMoney(balance, currency)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {anchor
              ? `Counted from your reset of ${formatMoney(Number(anchor.balance_amount), currency)} on ${formatExactDate(anchor.as_of_date)}`
              : "Net of every entry recorded here"}
          </p>
        </div>
      }
    />
  );
}
