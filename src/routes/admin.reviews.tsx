import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Star,
  Eye,
  Check,
  X as XIcon,
  RotateCcw,
  Trash2,
  Search,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminReviewCounts,
  adminListReviews,
  adminSetReviewStatus,
  adminSetFeatured,
  adminDeletePermanent,
  type AdminReviewCounts,
  type ReviewRow,
  type ReviewStatus,
} from "@/lib/reviews.functions";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviewsPage,
});

const TABS: { key: ReviewStatus; label: string; color: string }[] = [
  { key: "pending", label: "Pending", color: "text-amber-700 bg-amber-50 border-amber-200" },
  { key: "approved", label: "Approved", color: "text-green-700 bg-green-50 border-green-200" },
  { key: "rejected", label: "Rejected", color: "text-red-700 bg-red-50 border-red-200" },
  { key: "deleted", label: "Deleted", color: "text-black/60 bg-black/[0.04] border-black/10" },
];

function AdminReviewsPage() {
  const [tab, setTab] = useState<ReviewStatus>("pending");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<ReviewRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ReviewRow | null>(null);

  const countsFn = useServerFn(getAdminReviewCounts);
  const listFn = useServerFn(adminListReviews);

  const countsQ = useQuery<AdminReviewCounts>({
    queryKey: ["admin", "reviews", "counts"],
    queryFn: () => countsFn(),
  });

  const listQ = useQuery<ReviewRow[]>({
    queryKey: ["admin", "reviews", "list", tab],
    queryFn: () => listFn({ data: { status: tab } }),
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return listQ.data ?? [];
    return (listQ.data ?? []).filter(
      (r) =>
        r.customer_name.toLowerCase().includes(s) ||
        r.product_name.toLowerCase().includes(s) ||
        r.order_number.toLowerCase().includes(s) ||
        (r.review_title ?? "").toLowerCase().includes(s),
    );
  }, [listQ.data, search]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TABS.map((t) => {
          const count = countsQ.data?.[t.key] ?? 0;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "rounded-2xl border p-5 text-left transition",
                active ? "border-[#CF0A0A] shadow-sm bg-white" : "border-black/5 bg-white hover:border-black/10",
              ].join(" ")}
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-black/50 font-semibold">{t.label} Reviews</p>
              <p className="mt-2 text-3xl font-bold text-black">
                {countsQ.isLoading ? <span className="text-black/30">—</span> : count}
              </p>
            </button>
          );
        })}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-black/[0.03] p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                tab === t.key ? "bg-white shadow text-black" : "text-black/60 hover:text-black",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, product, order"
            className="w-72 rounded-xl border border-black/10 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#CF0A0A]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-black/5 overflow-hidden">
        {listQ.isLoading ? (
          <div className="py-24 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#CF0A0A]" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-black/[0.04] grid place-items-center">
              <MessageSquare className="h-6 w-6 text-black/30" />
            </div>
            <p className="mt-4 text-sm text-black/60">No {tab} reviews yet</p>
          </div>
        ) : (
          <ReviewsTable
            rows={filtered}
            tab={tab}
            onView={setDetail}
            onDelete={setConfirmDelete}
          />
        )}
      </div>

      {detail && (
        <ReviewDetailModal review={detail} onClose={() => setDetail(null)} />
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          review={confirmDelete}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function ReviewsTable({
  rows,
  tab,
  onView,
  onDelete,
}: {
  rows: ReviewRow[];
  tab: ReviewStatus;
  onView: (r: ReviewRow) => void;
  onDelete: (r: ReviewRow) => void;
}) {
  const qc = useQueryClient();
  const setStatusFn = useServerFn(adminSetReviewStatus);
  const setFeaturedFn = useServerFn(adminSetFeatured);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
  };

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: ReviewStatus }) => setStatusFn({ data: v }),
    onSuccess: (_, v) => {
      toast.success(`Review moved to ${v.status}`);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const setFeatured = useMutation({
    mutationFn: (v: { id: string; featured: boolean }) => setFeaturedFn({ data: v }),
    onSuccess: () => {
      toast.success("Homepage visibility updated");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#FAFAFA] border-b border-black/5">
          <tr className="text-left text-[11px] uppercase tracking-widest text-black/50">
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Customer</th>
            <th className="px-4 py-3 font-semibold">Product</th>
            <th className="px-4 py-3 font-semibold">Rating</th>
            {tab === "approved" && <th className="px-4 py-3 font-semibold">Homepage</th>}
            {tab === "deleted" && <th className="px-4 py-3 font-semibold">Deleted By</th>}
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-black/5 hover:bg-black/[0.015]">
              <td className="px-4 py-3 text-black/60">
                {new Date(
                  tab === "deleted" ? r.deleted_at ?? r.created_at : r.created_at,
                ).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {r.customer_photo ? (
                    <img src={r.customer_photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-black/[0.06] grid place-items-center text-[11px] font-bold text-black/50">
                      {r.customer_name.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-black truncate">{r.customer_name}</p>
                    <p className="text-[11px] text-black/50 truncate">{r.order_number}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 max-w-xs">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-[#F7F5F0] overflow-hidden grid place-items-center">
                    {r.product_image ? (
                      <img src={r.product_image} alt="" className="h-full w-full object-contain p-0.5" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-black truncate">{r.product_name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-black/40">{r.module}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < r.rating ? "fill-amber-400 text-amber-400" : "text-black/15"
                      }`}
                    />
                  ))}
                </div>
              </td>
              {tab === "approved" && (
                <td className="px-4 py-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r.featured_on_homepage}
                      onChange={(e) => setFeatured.mutate({ id: r.id, featured: e.target.checked })}
                      className="sr-only peer"
                    />
                    <span className="relative w-10 h-5 rounded-full bg-black/15 peer-checked:bg-[#CF0A0A] transition">
                      <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
                    </span>
                    <span className="text-xs font-medium text-black/60">
                      {r.featured_on_homepage ? "On" : "Off"}
                    </span>
                  </label>
                </td>
              )}
              {tab === "deleted" && (
                <td className="px-4 py-3 text-xs text-black/60">
                  {r.deleted_by_email ?? "—"}
                </td>
              )}
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <IconBtn label="View" onClick={() => onView(r)}>
                    <Eye className="h-4 w-4" />
                  </IconBtn>
                  {tab === "pending" && (
                    <>
                      <IconBtn
                        label="Approve"
                        color="text-green-600"
                        onClick={() => setStatus.mutate({ id: r.id, status: "approved" })}
                      >
                        <Check className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        label="Reject"
                        color="text-red-600"
                        onClick={() => setStatus.mutate({ id: r.id, status: "rejected" })}
                      >
                        <XIcon className="h-4 w-4" />
                      </IconBtn>
                    </>
                  )}
                  {(tab === "approved" || tab === "rejected") && (
                    <>
                      <IconBtn
                        label="Return to Pending"
                        onClick={() => setStatus.mutate({ id: r.id, status: "pending" })}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        label="Delete"
                        color="text-red-600"
                        onClick={() => setStatus.mutate({ id: r.id, status: "deleted" })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </>
                  )}
                  {tab === "deleted" && (
                    <>
                      <IconBtn
                        label="Restore"
                        onClick={() => setStatus.mutate({ id: r.id, status: "pending" })}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        label="Permanently Delete"
                        color="text-red-600"
                        onClick={() => onDelete(r)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  color,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2 rounded-lg hover:bg-black/[0.05] transition ${color ?? "text-black/60"}`}
    >
      {children}
    </button>
  );
}

function ReviewDetailModal({ review, onClose }: { review: ReviewRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#CF0A0A] font-bold">Review</p>
            <h2 className="text-xl font-bold text-black">Review Details</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-black/5">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto">
          <section>
            <h3 className="text-xs uppercase tracking-widest text-black/50 font-semibold">Customer</h3>
            <div className="mt-2 flex items-center gap-3">
              {review.customer_photo ? (
                <img src={review.customer_photo} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-black/[0.06] grid place-items-center font-bold text-black/50">
                  {review.customer_name.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              <div>
                <p className="font-semibold text-black">{review.customer_name}</p>
                <p className="text-xs text-black/60">{review.customer_email ?? "—"}</p>
                <p className="text-xs text-black/60">{review.customer_phone ?? "—"}</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-widest text-black/50 font-semibold">Order</h3>
            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] text-black/50">Order Number</p>
                <p className="font-semibold text-black">{review.order_number}</p>
              </div>
              <div>
                <p className="text-[11px] text-black/50">Module</p>
                <p className="font-semibold text-black capitalize">{review.module}</p>
              </div>
              <div>
                <p className="text-[11px] text-black/50">Category</p>
                <p className="font-semibold text-black">{review.category ?? "—"}</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-widest text-black/50 font-semibold">Product</h3>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-16 w-16 rounded-xl bg-[#F7F5F0] overflow-hidden grid place-items-center">
                {review.product_image ? (
                  <img src={review.product_image} alt="" className="h-full w-full object-contain p-1" />
                ) : null}
              </div>
              <p className="font-semibold text-black">{review.product_name}</p>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-widest text-black/50 font-semibold">Review</h3>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < review.rating ? "fill-amber-400 text-amber-400" : "text-black/15"
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm font-semibold text-black">{review.rating}.0</span>
              </div>
              {review.review_title && (
                <p className="text-lg font-bold text-black">{review.review_title}</p>
              )}
              <p className="text-sm text-black/70 whitespace-pre-wrap leading-relaxed">{review.review_text}</p>
              <p className="text-xs text-black/40 pt-2">
                Submitted on{" "}
                {new Date(review.created_at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ review, onClose }: { review: ReviewRow; onClose: () => void }) {
  const qc = useQueryClient();
  const fn = useServerFn(adminDeletePermanent);
  const mut = useMutation({
    mutationFn: () => fn({ data: { id: review.id } }),
    onSuccess: () => {
      toast.success("Review permanently deleted");
      qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="h-12 w-12 rounded-full bg-red-50 grid place-items-center">
          <Trash2 className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-black">Permanently delete this review?</h3>
        <p className="mt-2 text-sm text-black/60">
          This action cannot be undone. The customer will be able to submit a brand new review for this product.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-black/60 hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
