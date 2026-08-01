import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isValidPhone, normalizePhone, phoneToEmail } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MyLedger" },
      {
        name: "description",
        content:
          "Sign in to MyLedger with your mobile number to track accounts, cards, EMIs and spending.",
      },
      { property: "og:title", content: "Sign in — MyLedger" },
      {
        property: "og:description",
        content:
          "Sign in to MyLedger with your mobile number to track accounts, cards, EMIs and spending.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setBusy(true);
    try {
      const email = phoneToEmail(phone);
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone: normalizePhone(phone),
              display_name: name || normalizePhone(phone),
            },
          },
        });
        if (error) throw error;
        toast.success("Account created — you're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(
        msg.toLowerCase().includes("invalid login")
          ? "Wrong mobile number or password"
          : msg,
      );
    } finally {
      setBusy(false);
    }
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
            Sign in with your mobile number — accounts, cards, EMIs and spending, synced live.
          </p>
        </div>

        <form onSubmit={submit} className="surface-card space-y-4 p-6">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={
                  "rounded-full py-2 text-sm font-medium transition-colors " +
                  (mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")
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
                maxLength={60}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile number</Label>
            <div className="flex items-center gap-2">
              <span className="flex h-10 items-center rounded-md border border-border px-3 text-sm text-muted-foreground">
                +91
              </span>
              <Input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9928452506"
                autoComplete="tel"
                inputMode="numeric"
                maxLength={10}
              />
            </div>
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
              maxLength={72}
            />
          </div>

          <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={busy}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Private by design — only you (and your admin) can see your ledger.
        </p>
      </div>
    </div>
  );
}
