import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ImageDropzone, type ImageValue } from "./ImageDropzone";
import {
  createCollege,
  updateCollege,
  type CollegeRow,
} from "@/lib/college.functions";
import { listSchoolNames } from "@/lib/school-uniform.functions";
import { sanitizeSlug, sanitizeSlugLive, isValidSlug, SLUG_HELP } from "@/lib/slug";


export function CollegeDialog({
  open,
  onOpenChange,
  college,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  college?: CollegeRow | null;
}) {
  const isEdit = !!college;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [upload, setUpload] = useState<ImageValue>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  useEffect(() => {
    if (open) {
      setName(college?.name ?? "");
      setSlug(college?.slug ?? "");
      setSlugTouched(!!college);
      setIsActive(college?.is_active ?? true);
      setUpload(null);
      setRemoveLogo(false);
    }
  }, [open, college]);

  useEffect(() => {
    if (!slugTouched) setSlug(sanitizeSlug(name));
  }, [name, slugTouched]);


  const qc = useQueryClient();
  const create = useServerFn(createCollege);
  const update = useServerFn(updateCollege);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("College name is required");
      if (!slug.trim()) throw new Error("Slug is required");
      if (isEdit && college) {
        return update({
          data: {
            id: college.id,
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
      toast.success(isEdit ? "College updated" : "College created");
      qc.invalidateQueries({ queryKey: ["colleges"] });
      qc.invalidateQueries({ queryKey: ["college", slug] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit College" : "Add College"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="s-name">College Name *</Label>
            <Input
              id="s-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Educators"
              maxLength={120}
            />
            {!isEdit && <SchoolNameSuggestions onPick={(n) => { setName(n); setSlugTouched(false); }} />}
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
            <Label>College Logo</Label>
            <ImageDropzone
              variant="logo"
              value={upload}
              currentUrl={removeLogo ? null : college?.logoUrl ?? null}
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
                When off, this college is hidden from the storefront.
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
            {mutation.isPending ? "Saving..." : "Save College"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SchoolNameSuggestions({ onPick }: { onPick: (name: string) => void }) {
  const fn = useServerFn(listSchoolNames);
  const q = useQuery({
    queryKey: ["schools", "names"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
  });
  const [search, setSearch] = useState("");
  const items = q.data ?? [];
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = s ? items.filter((i) => i.name.toLowerCase().includes(s)) : items;
    return list.slice(0, 20);
  }, [items, search]);

  if (!q.isLoading && items.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-black/70">Existing School Names</p>
        <span className="text-[10px] text-black/40">Click to reuse</span>
      </div>
      {items.length > 6 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search existing schools..."
            className="h-8 pl-8 text-xs bg-white"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-auto">
        {q.isLoading ? (
          <span className="text-xs text-black/40">Loading...</span>
        ) : filtered.length === 0 ? (
          <span className="text-xs text-black/40">No matches</span>
        ) : (
          filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.name)}
              className="text-xs px-2.5 py-1 rounded-md bg-white border border-[#E5E7EB] hover:border-[#CF0A0A] hover:text-[#CF0A0A] transition-colors"
            >
              {s.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
