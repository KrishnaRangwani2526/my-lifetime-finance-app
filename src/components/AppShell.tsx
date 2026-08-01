import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListOrdered,
  Plus,
  PieChart,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tab = { to: string; label: string; icon: LucideIcon };

const TABS: Tab[] = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/transactions", label: "Activity", icon: ListOrdered },
  { to: "/reports", label: "Reports", icon: PieChart },
  { to: "/more", label: "More", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl">
      <div className="safe-bottom mx-auto flex max-w-lg items-end justify-between px-2 pt-1.5">
        {TABS.slice(0, 2).map((tab) => (
          <NavItem key={tab.to} tab={tab} active={pathname === tab.to} />
        ))}

        <Link
          to="/add"
          aria-label="Add transaction"
          className="-mt-6 flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-95"
        >
          <Plus className="size-7" strokeWidth={2.6} />
        </Link>

        {TABS.slice(2).map((tab) => (
          <NavItem key={tab.to} tab={tab} active={pathname.startsWith(tab.to)} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      to={tab.to}
      className={cn(
        "flex w-16 flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className={cn("size-[22px]", active && "drop-shadow-[0_0_8px_var(--primary)]")} />
      {tab.label}
    </Link>
  );
}

/** Shows while an admin is working inside another user's ledger. */
export function ScopeBanner() {
  const { scope, setScope } = useAuth();
  const qc = useQueryClient();
  if (!scope) return null;
  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 bg-primary px-4 py-2 text-primary-foreground">
      <Eye className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 truncate text-xs font-medium">
        Admin view — editing {scope.label}&apos;s ledger
      </p>
      <button
        onClick={() => {
          setScope(null);
          void qc.invalidateQueries();
        }}
        className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold"
      >
        Exit
      </button>
    </div>
  );
}

export function MobileScreen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <ScopeBanner />
      <main className={cn("mx-auto w-full max-w-lg px-4 pb-32 pt-5", className)}>{children}</main>
      <BottomNav />
    </div>
  );
}


export function ScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="size-6" />
      </span>
      <p className="font-display text-base font-medium">{title}</p>
      {hint && <p className="max-w-[24ch] text-sm text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}
