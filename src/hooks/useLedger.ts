import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  BankAccount,
  CardAccount,
  Category,
  Emi,
  Profile,
  Recurring,
  Template,
  Transaction,
} from "@/lib/finance";

const LEDGER_TABLES = [
  "transactions",
  "bank_accounts",
  "card_accounts",
  "categories",
  "emis",
  "recurring_transactions",
  "quick_entry_templates",
  "profiles",
  "balance_anchors",
] as const;

export type LedgerTable = (typeof LEDGER_TABLES)[number];

/**
 * Single realtime channel for the whole ledger. Any insert/update/delete on the
 * signed-in user's rows invalidates the matching query so every open device
 * (phone, tablet, desktop) stays in sync within a second.
 */
export function useRealtimeLedger() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`ledger:${user.id}`);

    for (const table of LEDGER_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          void qc.invalidateQueries({ queryKey: [table] });
          if (table !== "profiles") void qc.invalidateQueries({ queryKey: ["transactions"] });
        },
      );
    }

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, qc]);
}

function useOwnedQuery<T>(
  table: Exclude<LedgerTable, "profiles">,
  order: { column: string; asc: boolean },
) {
  const { scopeUserId } = useAuth();
  return useQuery({
    queryKey: [table, scopeUserId],
    enabled: !!scopeUserId,

    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", scopeUserId!)
        .order(order.column, { ascending: order.asc });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export const useTransactions = () =>
  useOwnedQuery<Transaction>("transactions", { column: "txn_date", asc: false });
export const useAccounts = () =>
  useOwnedQuery<BankAccount>("bank_accounts", { column: "created_at", asc: true });
export const useCards = () =>
  useOwnedQuery<CardAccount>("card_accounts", { column: "created_at", asc: true });
export const useCategories = () =>
  useOwnedQuery<Category>("categories", { column: "name", asc: true });
export const useEmis = () => useOwnedQuery<Emi>("emis", { column: "created_at", asc: false });
export const useRecurring = () =>
  useOwnedQuery<Recurring>("recurring_transactions", { column: "next_date", asc: true });
export const useTemplates = () =>
  useOwnedQuery<Template>("quick_entry_templates", { column: "name", asc: true });

export function useProfile() {
  const { scopeUserId } = useAuth();
  return useQuery({
    queryKey: ["profiles", scopeUserId],
    enabled: !!scopeUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", scopeUserId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

/** Generic owned-row writer: stamps the ledger owner and invalidates on success. */
export function useSaveRow<T extends Record<string, unknown>>(table: LedgerTable) {
  const { scopeUserId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: T }) => {
      if (!scopeUserId) throw new Error("Not signed in");
      // Column shapes differ per table; the caller owns the field contract.
      const writer = supabase.from(table) as unknown as {
        update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
        insert: (v: unknown) => Promise<{ error: unknown }>;
      };
      const { error } = id
        ? await writer.update(values).eq("id", id)
        : await writer.insert({ ...values, user_id: scopeUserId });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [table] });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}


export function useDeleteRow(table: LedgerTable) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [table] });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
