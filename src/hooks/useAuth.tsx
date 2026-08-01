import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const SCOPE_KEY = "myledger.admin.scope";

type Scope = { userId: string; label: string } | null;

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  /** Whose ledger the screens read and write. Own id unless an admin opened a user. */
  scopeUserId: string | null;
  /** Non-null only while an admin is working inside someone else's ledger. */
  scope: Scope;
  setScope: (scope: Scope) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  scopeUserId: null,
  scope: null,
  setScope: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scope, setScopeState] = useState<Scope>(null);

  useEffect(() => {
    // Listener first so no auth event is missed.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  // Role lives in its own table, checked server-side by RLS. This read only
  // decides whether the admin UI is offered.
  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Restore/clear the "viewing as" selection.
  useEffect(() => {
    if (!isAdmin) {
      setScopeState(null);
      return;
    }
    try {
      const raw = localStorage.getItem(SCOPE_KEY);
      if (raw) setScopeState(JSON.parse(raw) as Scope);
    } catch {
      /* ignore malformed storage */
    }
  }, [isAdmin]);

  const setScope = useCallback((next: Scope) => {
    setScopeState(next);
    try {
      if (next) localStorage.setItem(SCOPE_KEY, JSON.stringify(next));
      else localStorage.removeItem(SCOPE_KEY);
    } catch {
      /* ignore storage failures */
    }
  }, []);

  const signOut = useCallback(async () => {
    setScope(null);
    await supabase.auth.signOut();
  }, [setScope]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      isAdmin,
      scope: isAdmin ? scope : null,
      scopeUserId: (isAdmin ? scope?.userId : null) ?? userId,
      setScope,
      signOut,
    }),
    [session, loading, isAdmin, scope, userId, setScope, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
