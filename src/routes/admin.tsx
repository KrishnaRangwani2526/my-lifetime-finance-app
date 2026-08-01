import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { MobileScreen, ScreenHeader, EmptyState } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — MyLedger" },
      { name: "description", content: "Administrator console: view and edit every MyLedger user." },
      { property: "og:title", content: "Admin — MyLedger" },
      {
        property: "og:description",
        content: "Administrator console: view and edit every MyLedger user.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AdminConsole />
    </RequireAuth>
  ),
});

type AdminProfile = {
  id: string;
  phone: string | null;
  display_name: string | null;
  currency: string;
  monthly_budget: number | null;
};

function AdminConsole() {
  const { isAdmin, user, setScope } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminProfile | null>(null);

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, phone, display_name, currency, monthly_budget")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdminProfile[];
    },
  });

  const save = useMutation({
    mutationFn: async (row: AdminProfile) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: row.display_name,
          currency: row.currency,
          monthly_budget: row.monthly_budget,
        })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User updated");
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const rows = useMemo(() => users.data ?? [], [users.data]);

  if (!isAdmin) {
    return (
      <MobileScreen>
        <ScreenHeader title="Admin" subtitle="Restricted area" />
        <EmptyState
          icon={ShieldCheck}
          title="Administrators only"
          hint="This console is only available to the admin account."
        />
      </MobileScreen>
    );
  }

  function openAs(row: AdminProfile) {
    const label = row.display_name || row.phone || "user";
    if (row.id === user?.id) setScope(null);
    else setScope({ userId: row.id, label });
    void qc.invalidateQueries();
    void navigate({ to: "/" });
  }

  return (
    <MobileScreen>
      <ScreenHeader title="Admin console" subtitle={`${rows.length} registered users`} />

      {users.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="surface-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 font-display font-semibold text-primary">
                  {(row.display_name ?? row.phone ?? "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {row.display_name ?? "Unnamed"}
                    {row.id === user?.id && (
                      <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                        you
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    +91 {row.phone ?? "—"} · {row.currency}
                    {row.monthly_budget ? ` · budget ${row.monthly_budget}` : ""}
                  </p>
                </div>
              </div>

              {editing?.id === row.id ? (
                <div className="mt-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`name-${row.id}`}>Display name</Label>
                    <Input
                      id={`name-${row.id}`}
                      value={editing.display_name ?? ""}
                      maxLength={60}
                      onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`cur-${row.id}`}>Currency</Label>
                      <Input
                        id={`cur-${row.id}`}
                        value={editing.currency}
                        maxLength={3}
                        onChange={(e) =>
                          setEditing({ ...editing, currency: e.target.value.toUpperCase() })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`bud-${row.id}`}>Monthly budget</Label>
                      <Input
                        id={`bud-${row.id}`}
                        type="number"
                        inputMode="decimal"
                        value={editing.monthly_budget ?? ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            monthly_budget: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 rounded-full"
                      disabled={save.isPending}
                      onClick={() => save.mutate(editing)}
                    >
                      {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Save
                    </Button>
                    <Button
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 rounded-full"
                    onClick={() => setEditing(row)}
                  >
                    <UserCog className="mr-2 size-4" />
                    Edit details
                  </Button>
                  <Button className="flex-1 rounded-full" onClick={() => openAs(row)}>
                    Open ledger
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Opening a ledger shows the exact screens that user sees. Every edit you make saves to their
        account and syncs to their device in real time.
      </p>
    </MobileScreen>
  );
}
