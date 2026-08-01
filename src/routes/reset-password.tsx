import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — MyLedger" },
      {
        name: "description",
        content: "Set a new password for your MyLedger account and get back to your ledger.",
      },
      { property: "og:title", content: "Choose a new password — MyLedger" },
      {
        property: "og:description",
        content: "Set a new password for your MyLedger account and get back to your ledger.",
      },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Use at least 6 characters");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    void navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <ShieldCheck className="size-6" />
        </span>
        <h1 className="font-display text-2xl font-semibold">New password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ready
            ? "Choose a password you'll remember."
            : "Open this page from the reset link in your email."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12"
            />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={busy || !ready}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
