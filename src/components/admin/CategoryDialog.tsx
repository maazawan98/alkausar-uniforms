import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ImageDropzone, type ImageValue } from "./ImageDropzone";
import {
  createCategories,
  updateCategory,
  listCategorySuggestions,
  type SchoolCategory,
} from "@/lib/school-uniform.functions";

export function CategoryDialog({
  open,
  onOpenChange,
  schoolId,
  collection,
  category,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schoolId: string;
  collection: "boys" | "girls";
  category?: SchoolCategory | null;
}) {
  const isEdit = !!category;
  const qc = useQueryClient();
  const create = useServerFn(createCategories);
  const update = useServerFn(updateCategory);
  const suggestFn = useServerFn(listCategorySuggestions);

  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [upload, setUpload] = useState<ImageValue>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [showOnHomepage, setShowOnHomepage] = useState(false);

  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setPicked([]);
      setUpload(null);
      setRemoveImage(false);
      setShowOnHomepage(category?.show_on_homepage ?? false);
    }
  }, [open, category]);

  const suggestions = useQuery({
    queryKey: ["category-suggestions"],
    queryFn: () => suggestFn(),
    enabled: open && !isEdit,
  });

  const togglePick = (n: string) => {
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit && category) {
        if (!name.trim()) throw new Error("Category name is required");
        return update({
          data: {
            id: category.id,
            name: name.trim(),
            upload,
            removeImage,
            show_on_homepage: showOnHomepage,
          },
        });
      }
      const names = Array.from(
        new Set(
          [...picked, name.trim()].map((n) => n.trim()).filter((n) => n.length > 0),
        ),
      );
      if (names.length === 0) throw new Error("Add or select at least one category");
      return create({ data: { schoolId, collection, names } });
    },
    onSuccess: (res) => {
      if (!isEdit && "inserted" in (res as object)) {
        const r = res as { inserted: number; skipped: number };
        toast.success(
          r.inserted > 0
            ? `Added ${r.inserted} categor${r.inserted === 1 ? "y" : "ies"}${r.skipped > 0 ? ` · ${r.skipped} already existed` : ""}`
            : "All selected categories already exist",
        );
      } else {
        toast.success("Category updated");
      }
      qc.invalidateQueries({ queryKey: ["categories", schoolId, collection] });
      qc.invalidateQueries({ queryKey: ["schools"] });
      qc.invalidateQueries({ queryKey: ["category-suggestions"] });
      qc.invalidateQueries({ queryKey: ["homepage-categories"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Category" : `Add ${collection === "boys" ? "Boys" : "Girls"} Category`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="c-name">Category Name{isEdit ? " *" : ""}</Label>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Shirt"
              maxLength={120}
            />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label>Existing category suggestions</Label>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 max-h-48 overflow-y-auto">
                {suggestions.isLoading ? (
                  <p className="text-xs text-black/40">Loading...</p>
                ) : (suggestions.data?.length ?? 0) === 0 ? (
                  <p className="text-xs text-black/45">
                    No suggestions yet — type a name above to create your first category.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.data!.map((s) => {
                      const active = picked.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => togglePick(s)}
                          className={[
                            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                            active
                              ? "bg-[#CF0A0A] text-white"
                              : "bg-white border border-[#E5E7EB] text-black/70 hover:border-black/20",
                          ].join(" ")}
                        >
                          {active ? <Check className="h-3 w-3" /> : null}
                          {s}
                          {active ? <X className="h-3 w-3 opacity-70" /> : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-xs text-black/45">
                Suggestions from every school. Selecting one creates a new category for this school only.
              </p>
            </div>
          )}

          {isEdit && (
            <div className="space-y-2">
              <Label>Category Image</Label>
              <ImageDropzone
                variant="square"
                value={upload}
                currentUrl={removeImage ? null : category?.imageUrl ?? null}
                onChange={(v) => {
                  setUpload(v);
                  if (v) setRemoveImage(false);
                }}
                onRemoveExisting={() => setRemoveImage(true)}
              />
            </div>
          )}

          {isEdit && (
            <div className="flex items-center justify-between rounded-xl border border-[#E5E7EB] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-black">Show on Home Page</p>
                <p className="text-xs text-black/50">
                  Feature this category in the storefront home page grid.
                </p>
              </div>
              <Switch checked={showOnHomepage} onCheckedChange={setShowOnHomepage} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-[#CF0A0A] hover:bg-[#DC5F00] text-white"
          >
            {mutation.isPending ? "Saving..." : "Save Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
