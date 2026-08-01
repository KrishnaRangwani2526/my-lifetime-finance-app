import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, MobileScreen, ScreenHeader } from "@/components/AppShell";
import { useCategories, useDeleteRow, useSaveRow } from "@/hooks/useLedger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories — MyLedger" },
      {
        name: "description",
        content: "Create spending and income categories so your reports stay meaningful.",
      },
      { property: "og:title", content: "Categories — MyLedger" },
      {
        property: "og:description",
        content: "Create spending and income categories so your reports stay meaningful.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Categories />
    </RequireAuth>
  ),
});

function Categories() {
  const { data: categories = [] } = useCategories();
  const save = useSaveRow("categories");
  const remove = useDeleteRow("categories");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🏷️");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name the category");
      return;
    }
    try {
      await save.mutateAsync({ values: { name: name.trim(), icon, is_custom: true } });
      toast.success("Category added");
      setName("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <MobileScreen>
      <ScreenHeader
        title="Categories"
        subtitle="Organise your entries"
        action={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="size-10 shrink-0 rounded-full">
                <Plus className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>New category</SheetTitle>
              </SheetHeader>
              <form onSubmit={submit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cat-name">Name</Label>
                  <Input
                    id="cat-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Groceries"
                    className="h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat-icon">Emoji</Label>
                  <Input
                    id="cat-icon"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value.slice(0, 2))}
                    className="h-12 text-center text-xl"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                  {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Add category
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          hint="Add a few categories like Food, Rent or Salary."
        />
      ) : (
        <div className="surface-card divide-y divide-border overflow-hidden">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-base">
                {c.icon ?? "🏷️"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.is_custom ? "Custom" : "Default"}
                </p>
              </div>
              <button
                onClick={() => {
                  void remove.mutateAsync(c.id).then(() => toast.success("Category removed"));
                }}
                aria-label={`Delete ${c.name}`}
                className="text-muted-foreground transition-colors active:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </MobileScreen>
  );
}
