import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MyLedger" },
      {
        name: "description",
        content: "Sign in to MyLedger to track your accounts, cards, EMIs and spending.",
      },
      { property: "og:title", content: "Sign in — MyLedger" },
      {
        property: "og:description",
        content: "Sign in to MyLedger to track your accounts, cards, EMIs and spending.",
      },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Try email instead.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/", replace: true });
  }

  async function reset() {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset link sent.");
  }

  return (
    <div className="hero-gradient flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <Wallet className="size-7" />
          </span>
          <h1 className="font-display text-3xl font-semibold">MyLedger</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your accounts, cards, EMIs and daily spending — synced live.
          </p>
        </div>

        {sent ? (
          <div className="surface-card space-y-3 p-6 text-center">
            <ShieldCheck className="mx-auto size-8 text-primary" />
            <p className="font-display text-lg">Confirm your email</p>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to {email}. Open it on this device to finish setting up.
            </p>
            <Button variant="ghost" className="w-full" onClick={() => setSent(false)}>
              Back
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="surface-card space-y-4 p-6">
            <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={
                    "rounded-full py-2 text-sm font-medium transition-colors " +
                    (mode === m
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground")
                  }
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Krishna"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={busy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="secondary"
              className="h-12 w-full rounded-full text-base"
              onClick={google}
              disabled={busy}
            >
              Continue with Google
            </Button>

            {mode === "signin" && (
              <button
                type="button"
                onClick={reset}
                className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Forgot your password?
              </button>
            )}
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Private by design — only you can see your ledger.
        </p>
      </div>
    </div>
  );
}
