import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarSync,
  ChevronRight,
  CreditCard,
  Landmark,
  LogOut,
  PiggyBank,
  Settings,
  Tags,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { MobileScreen, ScreenHeader } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useLedger";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "More — MyLedger" },
      {
        name: "description",
        content: "Manage accounts, cards, categories, EMIs, recurring bills and quick entries.",
      },
      { property: "og:title", content: "More — MyLedger" },
      {
        property: "og:description",
        content: "Manage accounts, cards, categories, EMIs, recurring bills and quick entries.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <More />
    </RequireAuth>
  ),
});

const LINKS: { to: string; label: string; hint: string; icon: LucideIcon }[] = [
  { to: "/accounts", label: "Accounts", hint: "Banks and wallets", icon: Landmark },
  { to: "/cards", label: "Cards", hint: "Limits and dues", icon: CreditCard },
  { to: "/categories", label: "Categories", hint: "Organise your spending", icon: Tags },
  { to: "/emis", label: "EMIs & loans", hint: "Track instalments", icon: PiggyBank },
  { to: "/recurring", label: "Recurring", hint: "Bills and subscriptions", icon: CalendarSync },
  { to: "/templates", label: "Quick entries", hint: "One-tap favourites", icon: Zap },
  { to: "/settings", label: "Settings", hint: "Currency and budget", icon: Settings },
];

function More() {
  const { data: profile } = useProfile();
  const { user, signOut, isAdmin } = useAuth();

  return (
    <MobileScreen>
      <ScreenHeader title="More" subtitle="Everything else" />

      <div className="surface-card mb-4 flex items-center gap-3 p-4">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/15 font-display text-lg font-semibold text-primary">
          {(profile?.display_name ?? profile?.phone ?? "?").charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{profile?.display_name ?? "Your profile"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {profile?.phone ? `+91 ${profile.phone}` : emailToPhone(user?.email)}
          </p>
        </div>
      </div>

      {isAdmin && (
        <Link
          to="/admin"
          className="surface-card mb-4 flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-secondary/60"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Admin console</p>
            <p className="text-xs text-muted-foreground">View and edit every user</p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      )}


      <div className="surface-card divide-y divide-border overflow-hidden">
        {LINKS.map(({ to, label, hint, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-secondary/60"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
              <Icon className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <button
        onClick={() => void signOut()}
        className="surface-card mt-4 flex w-full items-center gap-3 px-4 py-3.5 text-destructive"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-destructive/10">
          <LogOut className="size-4.5" />
        </span>
        <span className="text-sm font-medium">Sign out</span>
      </button>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        MyLedger syncs instantly across every device you sign in on.
      </p>
    </MobileScreen>
  );
}
