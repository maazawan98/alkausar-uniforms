import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Eye,
  Power,
  Building2,
  Search,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  createBusinessInformation,
  deleteBusinessInformation,
  listBusinessInformation,
  toggleBusinessInformationActive,
  updateBusinessInformation,
  WORKING_DAYS,
  type BusinessInformationRow,
} from "@/lib/business-info.functions";

export const Route = createFileRoute("/admin/website-setting/business-information")({
  component: BusinessInformationPage,
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

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m || 0).padStart(2, "0")} ${ampm}`;
}

function summarizeDays(days: string[]) {
  if (!days?.length) return "—";
  const order = WORKING_DAYS as readonly string[];
  const idx = days
    .map((d) => order.indexOf(d))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (!idx.length) return "—";
  // contiguous?
  const contiguous = idx.every((n, i) => i === 0 || n === idx[i - 1] + 1);
  if (contiguous && idx.length > 1) {
    return `${order[idx[0]]} - ${order[idx[idx.length - 1]]}`;
  }
  return idx.map((i) => order[i]).join(", ");
}

function BusinessInformationPage() {
  const qc = useQueryClient();
  const list = useServerFn(listBusinessInformation);
  const create = useServerFn(createBusinessInformation);
  const update = useServerFn(updateBusinessInformation);
  const toggle = useServerFn(toggleBusinessInformationActive);
  const del = useServerFn(deleteBusinessInformation);

  const rowsQ = useQuery<BusinessInformationRow[]>({
    queryKey: ["business-information"],
    queryFn: () => list(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessInformationRow | null>(null);
  const [viewing, setViewing] = useState<BusinessInformationRow | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 8;

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => toggle({ data: v }),
    onSuccess: (_, v) => {
      toast.success(v.is_active ? "Activated" : "Deactivated");
      qc.invalidateQueries({ queryKey: ["business-information"] });
      qc.invalidateQueries({ queryKey: ["public-business-info"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["business-information"] });
      qc.invalidateQueries({ queryKey: ["public-business-info"] });
      setConfirmId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = rowsQ.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.business_name, r.email, r.phone_number, r.whatsapp_number ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8 pb-6 border-b border-[#E5E7EB]">
        <div>
          <div className="text-xs font-medium text-black/50 mb-1">
            <Link to="/admin/website-setting" className="hover:text-[#CF0A0A] transition-colors">
              Website Setting
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-black/70">Business Information</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-black tracking-tight">
            Business Information
          </h2>
          <p className="mt-2 text-[15px] text-black/55 max-w-2xl">
            Manage the business details shown across the website — footer, contact page and social
            links. Only the active record is displayed on the storefront.
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
          Add Business Information
        </button>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-[#F1F1F1] flex items-center gap-3 justify-between">
          <div className="text-xs uppercase tracking-wider text-black/55 font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#CF0A0A]" />
            All Records
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/40" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, phone…"
              className="w-full rounded-lg border border-[#E5E7EB] bg-white pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-[#CF0A0A]"
            />
          </div>
        </div>

        {rowsQ.isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-black/[0.04] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-10 w-10 mx-auto text-black/25" />
            <p className="mt-3 text-sm text-black/60">
              {rows.length === 0
                ? "No business information yet. Add one to display it on the website."
                : "No records match your search."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] text-black/55 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-semibold px-5 py-3">Business Name</th>
                  <th className="text-left font-semibold px-5 py-3">Email</th>
                  <th className="text-left font-semibold px-5 py-3">Phone</th>
                  <th className="text-left font-semibold px-5 py-3">WhatsApp</th>
                  <th className="text-left font-semibold px-5 py-3">Working Days</th>
                  <th className="text-left font-semibold px-5 py-3">Shop Timing</th>
                  <th className="text-left font-semibold px-5 py-3">Status</th>
                  <th className="text-left font-semibold px-5 py-3">Updated</th>
                  <th className="text-right font-semibold px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F1F1]">
                {pageRows.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-4 font-semibold text-black">{r.business_name}</td>
                    <td className="px-5 py-4 text-black/80">{r.email}</td>
                    <td className="px-5 py-4 text-black/80 font-mono text-xs">{r.phone_number}</td>
                    <td className="px-5 py-4 text-black/70 font-mono text-xs">
                      {r.whatsapp_number || <span className="text-black/40 font-sans">—</span>}
                    </td>
                    <td className="px-5 py-4 text-black/70 text-xs">{summarizeDays(r.working_days)}</td>
                    <td className="px-5 py-4 text-black/70 text-xs">
                      {fmtTime(r.opening_time)} – {fmtTime(r.closing_time)}
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
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMut.mutate({ id: r.id, is_active: !r.is_active })}
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
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(r.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#CF0A0A] hover:bg-[#CF0A0A]/[0.06] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#F1F1F1] text-xs text-black/60">
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BusinessInfoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["business-information"] });
          qc.invalidateQueries({ queryKey: ["public-business-info"] });
          setDialogOpen(false);
        }}
        create={create}
        update={update}
      />

      <ViewDialog viewing={viewing} onClose={() => setViewing(null)} />

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business Information</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This cannot be undone.
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

function ViewDialog({
  viewing,
  onClose,
}: {
  viewing: BusinessInformationRow | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!viewing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Business Information</DialogTitle>
        </DialogHeader>
        {viewing && (
          <div className="space-y-4 py-2">
            <Section title="Basic Information">
              <Row label="Business Name" value={viewing.business_name} />
              <Row label="Email" value={viewing.email} />
              <Row label="Phone" value={viewing.phone_number} />
              <Row label="WhatsApp" value={viewing.whatsapp_number || "—"} />
              <Row label="Landline" value={viewing.landline_number || "—"} />
              <Row label="Address" value={viewing.address} />
              <Row label="Google Maps" value={viewing.google_maps_link || "—"} />
              <Row label="Description" value={viewing.business_description || "—"} />
            </Section>
            <Section title="Business Hours">
              <Row label="Opening" value={fmtTime(viewing.opening_time)} />
              <Row label="Closing" value={fmtTime(viewing.closing_time)} />
              <Row label="Working Days" value={summarizeDays(viewing.working_days)} />
            </Section>
            <Section title="Social Media">
              <Row label="Facebook" value={viewing.facebook_url || "—"} />
              <Row label="Instagram" value={viewing.instagram_url || "—"} />
              <Row label="WhatsApp" value={viewing.whatsapp_url || "—"} />
              <Row label="TikTok" value={viewing.tiktok_url || "—"} />
              <Row label="YouTube" value={viewing.youtube_url || "—"} />
              <Row label="LinkedIn" value={viewing.linkedin_url || "—"} />
              <Row label="X (Twitter)" value={viewing.twitter_url || "—"} />
            </Section>
            {viewing.business_note && (
              <Section title="Business Note">
                <p className="text-sm text-black/80 whitespace-pre-wrap">{viewing.business_note}</p>
              </Section>
            )}
            <Row label="Status" value={viewing.is_active ? "Active" : "Inactive"} />
            <Row label="Last Updated" value={formatDate(viewing.updated_at)} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] p-4">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-black/50 mb-3">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-black/55 shrink-0 w-32">{label}</span>
      <span className="text-sm text-black/85 text-right break-words">{value}</span>
    </div>
  );
}

type FormState = {
  business_name: string;
  email: string;
  phone_number: string;
  whatsapp_number: string;
  landline_number: string;
  address: string;
  google_maps_link: string;
  business_description: string;
  facebook_url: string;
  instagram_url: string;
  whatsapp_url: string;
  tiktok_url: string;
  youtube_url: string;
  linkedin_url: string;
  twitter_url: string;
  opening_time: string;
  closing_time: string;
  working_days: string[];
  business_note: string;
  is_active: boolean;
};

function emptyForm(): FormState {
  return {
    business_name: "",
    email: "",
    phone_number: "",
    whatsapp_number: "",
    landline_number: "",
    address: "",
    google_maps_link: "",
    business_description: "",
    facebook_url: "",
    instagram_url: "",
    whatsapp_url: "",
    tiktok_url: "",
    youtube_url: "",
    linkedin_url: "",
    twitter_url: "",
    opening_time: "09:00",
    closing_time: "19:00",
    working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    business_note: "",
    is_active: true,
  };
}

function BusinessInfoDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
  create,
  update,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: BusinessInformationRow | null;
  onSaved: () => void;
  create: ReturnType<typeof useServerFn<typeof createBusinessInformation>>;
  update: ReturnType<typeof useServerFn<typeof updateBusinessInformation>>;
}) {
  const [f, setF] = useState<FormState>(emptyForm());

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setF({
        business_name: editing.business_name,
        email: editing.email,
        phone_number: editing.phone_number,
        whatsapp_number: editing.whatsapp_number ?? "",
        landline_number: editing.landline_number ?? "",
        address: editing.address,
        google_maps_link: editing.google_maps_link ?? "",
        business_description: editing.business_description ?? "",
        facebook_url: editing.facebook_url ?? "",
        instagram_url: editing.instagram_url ?? "",
        whatsapp_url: editing.whatsapp_url ?? "",
        tiktok_url: editing.tiktok_url ?? "",
        youtube_url: editing.youtube_url ?? "",
        linkedin_url: editing.linkedin_url ?? "",
        twitter_url: editing.twitter_url ?? "",
        opening_time: editing.opening_time || "09:00",
        closing_time: editing.closing_time || "19:00",
        working_days: editing.working_days ?? [],
        business_note: editing.business_note ?? "",
        is_active: editing.is_active,
      });
    } else {
      setF(emptyForm());
    }
  }, [open, editing]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = { ...f };
      if (editing) return update({ data: { id: editing.id, ...payload } as any });
      return create({ data: payload as any });
    },
    onSuccess: () => {
      toast.success(editing ? "Business information updated" : "Business information saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDay = (d: string) => {
    setF((s) => ({
      ...s,
      working_days: s.working_days.includes(d)
        ? s.working_days.filter((x) => x !== d)
        : [...s.working_days, d],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Business Information" : "Add Business Information"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Basic */}
          <FormSection title="Basic Information">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldWrap label="Business Name" required>
                <Input value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} />
              </FieldWrap>
              <FieldWrap label="Business Email" required>
                <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              </FieldWrap>
              <FieldWrap label="Phone Number" required>
                <Input value={f.phone_number} onChange={(e) => setF({ ...f, phone_number: e.target.value })} placeholder="+92 300 1234567" />
              </FieldWrap>
              <FieldWrap label="WhatsApp Number">
                <Input value={f.whatsapp_number} onChange={(e) => setF({ ...f, whatsapp_number: e.target.value })} placeholder="+92 301 7654321" />
              </FieldWrap>
              <FieldWrap label="Landline Number">
                <Input value={f.landline_number} onChange={(e) => setF({ ...f, landline_number: e.target.value })} placeholder="+92 42 12345678" />
              </FieldWrap>
              <FieldWrap label="Google Maps Link">
                <Input value={f.google_maps_link} onChange={(e) => setF({ ...f, google_maps_link: e.target.value })} placeholder="https://maps.google.com/…" />
              </FieldWrap>
            </div>
            <FieldWrap label="Business Address" required>
              <Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
            </FieldWrap>
            <FieldWrap label="Business Description">
              <Textarea rows={3} value={f.business_description} onChange={(e) => setF({ ...f, business_description: e.target.value })} />
            </FieldWrap>
          </FormSection>

          {/* Social */}
          <FormSection title="Social Media">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldWrap label="Facebook">
                <Input value={f.facebook_url} onChange={(e) => setF({ ...f, facebook_url: e.target.value })} placeholder="https://facebook.com/…" />
              </FieldWrap>
              <FieldWrap label="Instagram">
                <Input value={f.instagram_url} onChange={(e) => setF({ ...f, instagram_url: e.target.value })} placeholder="https://instagram.com/…" />
              </FieldWrap>
              <FieldWrap label="WhatsApp">
                <Input value={f.whatsapp_url} onChange={(e) => setF({ ...f, whatsapp_url: e.target.value })} placeholder="https://wa.me/…" />
              </FieldWrap>
              <FieldWrap label="TikTok">
                <Input value={f.tiktok_url} onChange={(e) => setF({ ...f, tiktok_url: e.target.value })} placeholder="https://tiktok.com/@…" />
              </FieldWrap>
              <FieldWrap label="YouTube">
                <Input value={f.youtube_url} onChange={(e) => setF({ ...f, youtube_url: e.target.value })} placeholder="https://youtube.com/…" />
              </FieldWrap>
              <FieldWrap label="LinkedIn">
                <Input value={f.linkedin_url} onChange={(e) => setF({ ...f, linkedin_url: e.target.value })} placeholder="https://linkedin.com/…" />
              </FieldWrap>
              <FieldWrap label="X (Twitter)">
                <Input value={f.twitter_url} onChange={(e) => setF({ ...f, twitter_url: e.target.value })} placeholder="https://x.com/…" />
              </FieldWrap>
            </div>
          </FormSection>

          {/* Hours */}
          <FormSection title="Business Hours">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldWrap label="Opening Time" required>
                <Input type="time" value={f.opening_time} onChange={(e) => setF({ ...f, opening_time: e.target.value })} />
              </FieldWrap>
              <FieldWrap label="Closing Time" required>
                <Input type="time" value={f.closing_time} onChange={(e) => setF({ ...f, closing_time: e.target.value })} />
              </FieldWrap>
            </div>
            <div>
              <Label className="text-xs font-semibold text-black/70">Working Days *</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {WORKING_DAYS.map((d) => {
                  const active = f.working_days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={[
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                        active
                          ? "bg-[#CF0A0A] border-[#CF0A0A] text-white"
                          : "bg-white border-[#E5E7EB] text-black/70 hover:border-black/40",
                      ].join(" ")}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </FormSection>

          {/* Note */}
          <FormSection title="Business Note">
            <FieldWrap label="Optional notice shown on the Contact page">
              <Textarea
                rows={3}
                value={f.business_note}
                onChange={(e) => setF({ ...f, business_note: e.target.value })}
                placeholder="Shop will remain closed on public holidays."
              />
            </FieldWrap>
          </FormSection>

          <div className="flex items-center justify-between rounded-xl border border-[#E5E7EB] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-black">Set as Active</p>
              <p className="text-xs text-black/50">
                The active record is displayed on the website. Activating this will deactivate any
                other active record.
              </p>
            </div>
            <Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saveMut.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="bg-[#CF0A0A] hover:bg-[#a80808] text-white"
          >
            {saveMut.isPending ? "Saving…" : editing ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] p-5 space-y-4">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-[#CF0A0A]">{title}</div>
      {children}
    </div>
  );
}
function FieldWrap({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-black/70">
        {label} {required && <span className="text-[#CF0A0A]">*</span>}
      </Label>
      {children}
    </div>
  );
}
