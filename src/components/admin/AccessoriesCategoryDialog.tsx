import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
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
  createAccessoriesCategory,
  updateAccessoriesCategory,
  type AccessoriesCategory,
} from "@/lib/accessories.functions";
import { sanitizeSlug, sanitizeSlugLive, isValidSlug, SLUG_HELP } from "@/lib/slug";


export function AccessoriesCategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category?: AccessoriesCategory | null;
}) {
  const isEdit = !!category;
  const qc = useQueryClient();
  const createFn = useServerFn(createAccessoriesCategory);
  const updateFn = useServerFn(updateAccessoriesCategory);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showOnHomepage, setShowOnHomepage] = useState(false);
  const [upload, setUpload] = useState<ImageValue>(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setSlug(category?.slug ?? "");
    setSlugDirty(!!category);
    setIsActive(category?.is_active ?? true);
    setShowOnHomepage(category?.show_on_homepage ?? false);
    setUpload(null);
    setRemoveImage(false);
  }, [open, category]);

  useEffect(() => {
    if (slugDirty) return;
    setSlug(sanitizeSlug(name));
  }, [name, slugDirty]);


  const mutation = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (!n) throw new Error("Category Name is required");
      const s = slug.trim();
      if (!s) throw new Error("Slug is required");
      if (isEdit && category) {
        return updateFn({
          data: {
            id: category.id,
            name: n,
            slug: s,
            is_active: isActive,
            show_on_homepage: showOnHomepage,
            upload,
            removeImage,
          },
        });
      }
      return createFn({
        data: { name: n, slug: s, is_active: isActive, show_on_homepage: showOnHomepage, upload },
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Category updated" : "Category added");
      qc.invalidateQueries({ queryKey: ["accessories-categories"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="a-name">Category Name *</Label>
            <Input
              id="a-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. School Bag"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="a-slug">Slug *</Label>
            <Input
              id="a-slug"
              value={slug}
              onChange={(e) => {
                setSlugDirty(true);
                setSlug(sanitizeSlugLive(e.target.value));
              }}
              placeholder="school-bag"
              maxLength={80}
            />
            {slug.length > 0 && !isValidSlug(slug) ? (
              <p className="text-[11px] text-[#CF0A0A]">{SLUG_HELP}</p>
            ) : (
              <p className="text-[11px] text-black/50">
                Auto-generated from the name. You can edit before saving.
              </p>
            )}
          </div>


          <div className="space-y-2">
            <Label>Category Image</Label>
            <ImageDropzone
              variant="square"
              value={upload}
              currentUrl={removeImage ? null : (category?.imageUrl ?? null)}
              onChange={(v) => {
                setUpload(v);
                if (v) setRemoveImage(false);
              }}
              onRemoveExisting={() => setRemoveImage(true)}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#E5E7EB] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-black">Active</p>
              <p className="text-xs text-black/50">
                When OFF, this category and all its products are hidden from customers.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#E5E7EB] px-4 py-3">
            <div className="pr-3">
              <p className="text-sm font-medium text-black">Show on Home Page</p>
              <p className="text-xs text-black/50 leading-relaxed">
                When enabled, this category will appear in the Home Page "Shop by Category" section under Accessories.
              </p>
            </div>
            <Switch checked={showOnHomepage} onCheckedChange={setShowOnHomepage} />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-[#CF0A0A] hover:bg-[#DC5F00] text-white"
          >
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
