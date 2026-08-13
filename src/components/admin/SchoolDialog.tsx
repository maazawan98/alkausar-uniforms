import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ImageDropzone, type ImageValue } from "./ImageDropzone";
import {
  createSchool,
  updateSchool,
  type SchoolRow,
} from "@/lib/school-uniform.functions";
import { sanitizeSlug, sanitizeSlugLive, isValidSlug, SLUG_HELP } from "@/lib/slug";


export function SchoolDialog({
  open,
  onOpenChange,
  school,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  school?: SchoolRow | null;
}) {
  const isEdit = !!school;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [upload, setUpload] = useState<ImageValue>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  useEffect(() => {
    if (open) {
      setName(school?.name ?? "");
      setSlug(school?.slug ?? "");
      setSlugTouched(!!school);
      setIsActive(school?.is_active ?? true);
      setUpload(null);
      setRemoveLogo(false);
    }
  }, [open, school]);

  useEffect(() => {
    if (!slugTouched) setSlug(sanitizeSlug(name));
  }, [name, slugTouched]);


  const qc = useQueryClient();
  const create = useServerFn(createSchool);
  const update = useServerFn(updateSchool);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("School name is required");
      if (!slug.trim()) throw new Error("Slug is required");
      if (isEdit && school) {
        return update({
          data: {
            id: school.id,
            name: name.trim(),
            slug: slug.trim(),
            is_active: isActive,
            upload,
            removeLogo,
          },
        });
      }
      return create({
        data: {
          name: name.trim(),
          slug: slug.trim(),
          is_active: isActive,
          upload,
        },
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? "School updated" : "School created");
      qc.invalidateQueries({ queryKey: ["schools"] });
      qc.invalidateQueries({ queryKey: ["school", slug] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit School" : "Add School"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="s-name">School Name *</Label>
            <Input
              id="s-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Educators"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-slug">Slug *</Label>
            <Input
              id="s-slug"
              value={slug}
              onChange={(e) => {
                setSlug(sanitizeSlugLive(e.target.value));
                setSlugTouched(true);
              }}
              placeholder="the-educators"
              maxLength={80}
            />
            {slug.length > 0 && !isValidSlug(slug) ? (
              <p className="text-xs text-[#CF0A0A]">{SLUG_HELP}</p>
            ) : (
              <p className="text-xs text-black/45">
                Auto-generated from the name. Must be unique. Lowercase letters, numbers, and dashes.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>School Logo</Label>
            <ImageDropzone
              variant="logo"
              value={upload}
              currentUrl={removeLogo ? null : school?.logoUrl ?? null}
              onChange={(v) => {
                setUpload(v);
                if (v) setRemoveLogo(false);
              }}
              onRemoveExisting={() => setRemoveLogo(true)}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[#E5E7EB] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-black">Active</p>
              <p className="text-xs text-black/50">
                When off, this school is hidden from the storefront.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
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
            {mutation.isPending ? "Saving..." : "Save School"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
