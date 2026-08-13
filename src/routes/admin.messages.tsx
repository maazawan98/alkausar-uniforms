import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Search, Trash2, MessageSquare, ChevronLeft, ChevronRight, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminListQueries, adminDeleteQuery, adminUpdateQueryStatus,
  type CustomerQueryRow,
} from "@/lib/customer-query.functions";
import { StatusBadge } from "./admin.newsletter";

export const Route = createFileRoute("/admin/messages")({
  component: AdminMessagesPage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function AdminMessagesPage() {
  const listFn = useServerFn(adminListQueries);
  const q = useQuery<CustomerQueryRow[]>({
    queryKey: ["admin-messages"],
    queryFn: () => listFn({ data: { type: "Contact" } }),
  });

  const qc = useQueryClient();
  const updateFn = useServerFn(adminUpdateQueryStatus);
  const markMut = useMutation({
    mutationFn: (id: string) => updateFn({ data: { id, status: "Read" } }),
    onSuccess: () => {
      toast.success("Marked as read");
      qc.invalidateQueries({ queryKey: ["admin-messages"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "New" | "Read" | "Replied">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<CustomerQueryRow | null>(null);
  const [deleting, setDeleting] = useState<CustomerQueryRow | null>(null);
  const pageSize = 25;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const arr = (q.data ?? []).filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!s) return true;
      return [r.customer_name, r.customer_email, r.customer_phone ?? "", r.subject ?? ""]
        .join(" ").toLowerCase().includes(s);
    });
    arr.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return arr;
  }, [q.data, search, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openView = (row: CustomerQueryRow) => {
    setViewing(row);
    if (row.status === "New") markMut.mutate(row.id);
  };

  return (
    <div>
      <PageHeader title="Contact Messages" subtitle="Inquiries submitted through the Contact page." />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, phone or subject…"
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
          className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="New">New</option>
          <option value="Read">Read</option>
          <option value="Replied">Replied</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <span className="ml-auto text-xs text-black/50">
          {filtered.length} {filtered.length === 1 ? "message" : "messages"}
        </span>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-black/55">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Customer Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F1F1F1]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="mx-auto h-14 w-14 rounded-full bg-[#F3F4F6] grid place-items-center mb-3">
                      <MessageSquare className="h-6 w-6 text-black/40" />
                    </div>
                    <p className="text-black/60 font-medium">No contact messages yet</p>
                    <p className="text-xs text-black/40 mt-1">Messages from the contact form appear here.</p>
                  </td>
                </tr>
              ) : paginated.map((r) => (
                <tr key={r.id} className={`border-b border-[#F1F1F1] hover:bg-[#FAFAFA] transition-colors animate-fade-in ${r.status === "New" ? "bg-blue-50/40" : ""}`}>
                  <td className="px-4 py-3 text-black/70 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3 font-semibold text-black whitespace-nowrap">{r.customer_name}</td>
                  <td className="px-4 py-3 text-black/70 whitespace-nowrap">{r.customer_email}</td>
                  <td className="px-4 py-3 text-black/70 whitespace-nowrap">{r.customer_phone || "—"}</td>
                  <td className="px-4 py-3 text-black/70 max-w-[240px] truncate">{r.subject || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openView(r)} title="View"
                        className="inline-grid place-items-center h-8 w-8 rounded-lg border border-[#E5E7EB] hover:bg-black hover:text-white hover:border-black transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => markMut.mutate(r.id)}
                        disabled={r.status === "Read" || markMut.isPending}
                        title="Mark as read"
                        className="inline-grid place-items-center h-8 w-8 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleting(r)} title="Delete"
                        className="inline-grid place-items-center h-8 w-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB] bg-[#FAFAFA]">
            <p className="text-xs text-black/60">Page {currentPage} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <ViewMessageDialog row={viewing} onClose={() => setViewing(null)} />
      <DeleteMessageDialog row={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function ViewMessageDialog({ row, onClose }: { row: CustomerQueryRow | null; onClose: () => void }) {
  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contact Message</DialogTitle>
          <DialogDescription>Full details of the customer inquiry.</DialogDescription>
        </DialogHeader>
        {row && (
          <div className="space-y-6 py-2">
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-black/50 font-semibold mb-3">Customer Information</h3>
              <div className="grid sm:grid-cols-2 gap-4 rounded-xl border border-[#E5E7EB] p-4 bg-[#FAFAFA]">
                <Row label="Name" value={row.customer_name} />
                <Row label="Email" value={row.customer_email} />
                <Row label="Phone" value={row.customer_phone || "—"} />
                <Row label="Status" value={<StatusBadge status={row.status} />} />
              </div>
            </section>
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-black/50 font-semibold mb-3">Contact Details</h3>
              <div className="rounded-xl border border-[#E5E7EB] p-4 space-y-4">
                <Row label="Subject" value={row.subject || "—"} />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-black/50 font-semibold mb-1.5">Full Message</p>
                  <p className="text-sm text-black whitespace-pre-wrap leading-relaxed">{row.message}</p>
                </div>
                <Row label="Submitted Date" value={fmtDate(row.created_at)} />
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-black/50 font-semibold mb-1">{label}</p>
      <div className="text-sm text-black">{value}</div>
    </div>
  );
}

function DeleteMessageDialog({ row, onClose }: { row: CustomerQueryRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const delFn = useServerFn(adminDeleteQuery);
  const mut = useMutation({
    mutationFn: () => delFn({ data: { id: row!.id } }),
    onSuccess: () => {
      toast.success("Message deleted");
      qc.invalidateQueries({ queryKey: ["admin-messages"] });
      qc.invalidateQueries({ queryKey: ["admin-query-counts"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Message?</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete this contact message from{" "}
            <span className="font-semibold text-black">{row?.customer_name}</span>? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
