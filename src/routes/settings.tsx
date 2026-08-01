import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { MobileScreen, ScreenHeader } from "@/components/AppShell";
import { useProfile, useSaveRow } from "@/hooks/useLedger";
import { useAuth } from "@/hooks/useAuth";
import { CURRENCIES, num } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MyLedger" },
      {
        name: "description",
        content: "Set your display name, preferred currency and a monthly spending budget.",
      },
      { property: "og:title", content: "Settings — MyLedger" },
      {
        property: "og:description",
        content: "Set your display name, preferred currency and a monthly spending budget.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SettingsScreen />
    </RequireAuth>
  ),
});

function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const save = useSaveRow("profiles");

  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [budget, setBudget] = useState("");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setCurrency(profile.currency);
    setBudget(profile.monthly_budget ? String(num(profile.monthly_budget)) : "");
  }, [profile]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      await save.mutateAsync({
        id: user.id,
        values: {
          display_name: displayName.trim() || null,
          currency,
          monthly_budget: budget ? Number(budget) : null,
        },
      });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <MobileScreen>
      <ScreenHeader title="Settings" subtitle="Your preferences" />

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Krishna"
            className="h-12"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="budget">Monthly budget</Label>
          <Input
            id="budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder="30000"
            className="numeric h-12"
          />
          <p className="text-xs text-muted-foreground">
            Shows a progress bar on your home screen. Leave empty to hide it.
          </p>
        </div>

        <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save settings
        </Button>
      </form>

      <div className="surface-card mt-6 p-4">
        <p className="text-xs text-muted-foreground">Signed in as</p>
        <p className="truncate text-sm font-medium">{user?.email}</p>
        <Button
          onClick={() => void signOut()}
          variant="ghost"
          className="mt-2 h-auto px-0 text-destructive"
        >
          Sign out
        </Button>
      </div>
    </MobileScreen>
  );
}
