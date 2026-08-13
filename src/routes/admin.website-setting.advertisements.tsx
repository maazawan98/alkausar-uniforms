import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  CheckCircle2,
  Loader2,
  Eye,
  Power,
  Upload,
  X,
  ImageIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createAdvertisement,
  deleteAdvertisement,
  listAdvertisements,
  toggleAdvertisementActive,
  updateAdvertisement,
  uploadAdvertisementImage,
  type AdvertisementRow,
} from "@/lib/advertisements.functions";

export const Route = createFileRoute("/admin/website-setting/advertisements")({
  component: AdvertisementsPage,
});

function formatDate(d: string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdvertisementsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAdvertisements);
  const toggle = useServerFn(toggleAdvertisementActive);
  const del = useServerFn(deleteAdvertisement);

  const rowsQ = useQuery<AdvertisementRow[]>({
    queryKey: ["advertisements"],
    queryFn: () => list(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdvertisementRow | null>(null);
  const [viewing, setViewing] = useState<AdvertisementRow | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => toggle({ data: v }),
    onSuccess: (_, v) => {
      toast.success(v.is_active ? "Advertisement activated" : "Advertisement deactivated");
      qc.invalidateQueries({ queryKey: ["advertisements"] });
      qc.invalidateQueries({ queryKey: ["active-advertisement"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["advertisements"] });
      qc.invalidateQueries({ queryKey: ["active-advertisement"] });
      setConfirmId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = rowsQ.data ?? [];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8 pb-6 border-b border-[#E5E7EB]">
        <div>
          <div className="text-xs font-medium text-black/50 mb-1">
            <Link to="/admin/website-setting" className="hover:text-[#CF0A0A] transition-colors">
              Website Setting
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-black/70">Homepage Advertisement</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-black tracking-tight">
            Homepage Advertisement
          </h2>
          <p className="mt-2 text-[15px] text-black/55 max-w-2xl">
            Manage promotional advertisements that appear as a popup on the home page. Only
            active advertisements are shown to customers, sorted by display priority.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#CF0A0A] hover:bg-[#a80808] text-white text-sm font-medium px-4 py-2.5 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Advertisement
        </button>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-[#F1F1F1] text-xs uppercase tracking-wider text-black/55 font-semibold flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-[#CF0A0A]" />
          All Advertisements
        </div>
        {rowsQ.isLoading ? (
          <div className="p-8 text-sm text-black/50">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-black/55">
            No advertisements yet. Add one to display a homepage popup.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] text-black/55 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-semibold px-5 py-3">Preview</th>
                  <th className="text-left font-semibold px-5 py-3">Title</th>
                  <th className="text-left font-semibold px-5 py-3">Redirect Link</th>
                  <th className="text-left font-semibold px-5 py-3">Priority</th>
                  <th className="text-left font-semibold px-5 py-3">Status</th>
                  <th className="text-left font-semibold px-5 py-3">Updated</th>
                  <th className="text-right font-semibold px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F1F1]">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-4">
                      <div className="h-14 w-24 rounded-lg overflow-hidden bg-black/[0.04] grid place-items-center border border-black/5">
                        {r.image_url ? (
                          <img src={r.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-black/30" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-black max-w-[260px]">
                      {r.title || <span className="text-black/40 font-normal">—</span>}
                    </td>
                    <td className="px-5 py-4 text-black/70 text-xs font-mono max-w-[240px] truncate">
                      {r.redirect_url || <span className="text-black/40 font-sans">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-black/[0.05] text-black/70 text-xs font-semibold px-2">
                        {r.display_priority}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {r.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-black/[0.05] text-black/60 text-xs font-medium px-2.5 py-1">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-black/60 text-xs">{formatDate(r.updated_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewing(r)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-black/70 hover:bg-black/[0.05] hover:text-black transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toggleMut.mutate({ id: r.id, is_active: !r.is_active })
                          }
                          disabled={toggleMut.isPending}
                          className={[
                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                            r.is_active
                              ? "text-black/70 hover:bg-black/[0.05]"
                              : "text-green-700 hover:bg-green-50",
                          ].join(" ")}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {r.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(r);
                            setDialogOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-black/70 hover:bg-black/[0.05] hover:text-black transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(r.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#CF0A0A] hover:bg-[#CF0A0A]/[0.06] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdvertisementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["advertisements"] });
          qc.invalidateQueries({ queryKey: ["active-advertisement"] });
          setDialogOpen(false);
        }}
      />

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Advertisement Details</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 py-2">
              {viewing.image_url && (
                <div className="rounded-xl overflow-hidden border border-black/5 bg-black/[0.04]">
                  <img src={viewing.image_url} alt="" className="w-full h-auto" />
                </div>
              )}
              <ViewRow label="Title" value={viewing.title || "—"} />
              <ViewRow label="Description" value={viewing.description || "—"} />
              <ViewRow label="Redirect Link" value={viewing.redirect_url || "—"} mono />
              <ViewRow label="Display Priority" value={String(viewing.display_priority)} />
              <ViewRow label="Status" value={viewing.is_active ? "Active" : "Inactive"} />
              <ViewRow label="Last Updated" value={formatDate(viewing.updated_at)} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Advertisement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this advertisement? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmId && deleteMut.mutate(confirmId)}
              className="rounded-lg bg-[#CF0A0A] hover:bg-[#a80808] text-white"
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ViewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-[#F9FAFB] px-4 py-3">
      <span className="text-[11px] uppercase tracking-wider font-semibold text-black/50">
        {label}
      </span>
      <span
        className={`text-sm text-black text-right max-w-[60%] break-words ${
          mono ? "font-mono" : "font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

const ACCEPT = "image/png,image/jpeg,image/webp";
const ACCEPT_REGEX = /^image\/(png|jpe?g|webp)$/;
const MAX_BYTES = 5 * 1024 * 1024;

function AdvertisementDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: AdvertisementRow | null;
  onSaved: () => void;
}) {
  const upload = useServerFn(uploadAdvertisementImage);
  const create = useServerFn(createAdvertisement);
  const update = useServerFn(updateAdvertisement);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [redirect, setRedirect] = useState("");
  const [priority, setPriority] = useState("1");
  const [isActive, setIsActive] = useState(true);

  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [existingPath, setExistingPath] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<{ dataUrl: string; filename: string; contentType: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setRedirect(editing?.redirect_url ?? "");
      setPriority(editing ? String(editing.display_priority) : "1");
      setIsActive(editing ? editing.is_active : true);
      setExistingUrl(editing?.image_url ?? null);
      setExistingPath(editing?.image_path ?? null);
      setNewFile(null);
    }
  }, [open, editing]);

  const onFile = (f: File) => {
    if (!ACCEPT_REGEX.test(f.type)) {
      toast.error("Please upload a JPG, PNG or WEBP image.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("Image is larger than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setNewFile({ dataUrl: String(reader.result), filename: f.name, contentType: f.type });
    reader.readAsDataURL(f);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const order = Number(priority);
      if (!Number.isInteger(order) || order < 1) {
        throw new Error("Display priority must be a positive integer.");
      }
      let imagePath = existingPath;
      if (newFile) {
        const base64 = newFile.dataUrl.split(",")[1] ?? "";
        const res = await upload({
          data: {
            fileName: newFile.filename,
            contentType: newFile.contentType,
            dataBase64: base64,
          },
        });
        imagePath = res.path;
      }
      if (!imagePath) throw new Error("Please upload an advertisement image.");

      const payload = {
        image_path: imagePath,
        title: title.trim() || null,
        description: description.trim() || null,
        redirect_url: redirect.trim() || null,
        display_priority: order,
        is_active: isActive,
      };
      if (editing) return update({ data: { id: editing.id, ...payload } });
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Advertisement updated" : "Advertisement saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewSrc = newFile?.dataUrl ?? existingUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Advertisement" : "Add Advertisement"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60 mb-1.5">
              Advertisement Image *
            </label>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.currentTarget.value = "";
              }}
            />
            {previewSrc ? (
              <div className="relative rounded-xl overflow-hidden border border-black/10 bg-black/[0.04]">
                <img src={previewSrc} alt="" className="w-full max-h-64 object-contain bg-white" />
                <div className="flex items-center justify-end gap-2 p-2 border-t border-black/5 bg-white">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-black/70 hover:bg-black/[0.05]"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewFile(null);
                      setExistingUrl(null);
                      setExistingPath(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#CF0A0A] hover:bg-[#CF0A0A]/[0.06]"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-black/15 hover:border-[#CF0A0A]/40 hover:bg-[#CF0A0A]/[0.02] transition-colors p-8 flex flex-col items-center justify-center gap-2 text-sm text-black/60"
              >
                <Upload className="h-6 w-6 text-black/40" />
                <span className="font-medium">Click to upload image</span>
                <span className="text-[11px] text-black/45">JPG, PNG or WEBP · up to 5MB</span>
              </button>
            )}
          </div>

          <TextField
            label="Advertisement Title"
            placeholder="Back to School Sale"
            value={title}
            onChange={setTitle}
          />

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60 mb-1.5">
              Advertisement Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Get up to 20% off on selected school uniforms."
              className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm focus:border-[#CF0A0A] outline-none resize-none"
            />
          </div>

          <TextField
            label="Redirect Link"
            placeholder="/school-uniforms or https://example.com"
            value={redirect}
            onChange={setRedirect}
            mono
          />

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60 mb-1.5">
              Display Priority *
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm focus:border-[#CF0A0A] outline-none"
            />
            <p className="text-[11px] text-black/50 mt-1">
              Positive integer. Lower numbers appear first when multiple ads are active.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-black/80">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-[#CF0A0A]"
            />
            Active (visible on website)
          </label>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-black/70 hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#CF0A0A] hover:bg-[#a80808] text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-60"
          >
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Update" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TextField({
  label,
  placeholder,
  value,
  onChange,
  mono,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-11 rounded-xl border border-black/10 px-3 text-sm focus:border-[#CF0A0A] outline-none ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
