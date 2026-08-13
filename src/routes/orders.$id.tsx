import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ArrowLeft, ShieldAlert, Upload, Star } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ReviewDialog } from "@/components/site/ReviewDialog";
import {
  getMyOrder,
  uploadPaymentScreenshot,
  resubmitPaymentScreenshot,
  type Order,
  type OrderItemSnapshot,
} from "@/lib/shop.functions";
import { listMyReviewStatuses, type MyReviewStatus } from "@/lib/reviews.functions";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order Details | Alkausar Uniforms" },
      { name: "description", content: "Order details and shipping information." },
    ],
  }),
  component: OrderDetailPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="py-32 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <Link to="/orders" className="mt-4 inline-block text-[#CF0A0A]">Back to orders</Link>
      </div>
    </SiteLayout>
  ),
});

function OrderDetailPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getMyOrder);
  const q = useQuery<Order | null>({
    queryKey: ["shop", "order", id],
    queryFn: () => fn({ data: { id } }),
  });
  const reviewFn = useServerFn(listMyReviewStatuses);
  const reviewsQ = useQuery<Record<string, MyReviewStatus>>({
    queryKey: ["my-reviews"],
    queryFn: () => reviewFn(),
  });
  const [reviewItem, setReviewItem] = useState<OrderItemSnapshot | null>(null);

  if (q.isLoading) {
    return (
      <SiteLayout>
        <div className="py-40 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#CF0A0A]" /></div>
      </SiteLayout>
    );
  }
  if (!q.data) throw notFound();
  const o = q.data;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-10 py-16">
        <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-black/60 hover:text-[#CF0A0A]">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#CF0A0A] font-bold">Order</p>
            <h1 className="text-3xl md:text-4xl font-bold text-black mt-1">{o.order_number}</h1>
            <p className="text-sm text-black/50 mt-1">
              Placed on {new Date(o.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
            {o.status}
          </span>
        </div>

        {o.payment_method === "online" && o.payment_status === "rejected" && (
          <PaymentRejectedCard orderId={o.id} />
        )}

        <div className="mt-8 grid lg:grid-cols-[1fr_320px] gap-8 items-start">
          <div className="space-y-6">
            <div className="bg-white border border-black/5 rounded-3xl p-6">
              <h3 className="text-lg font-bold mb-4">Items</h3>
              <div className="space-y-4">
                {o.items.map((it, idx) => {
                  const key = `${o.id}:${it.product_id}`;
                  const rev = reviewsQ.data?.[key];
                  const canReview = o.status === "delivered";
                  return (
                  <div key={idx} className="flex gap-4 border-b border-black/5 last:border-0 pb-4 last:pb-0">
                    <div className="w-20 h-24 rounded-xl bg-[#F7F5F0] overflow-hidden grid place-items-center shrink-0">
                      {it.product_image ? (
                        <img src={it.product_image} alt="" className="w-full h-full object-contain p-1.5" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-black/40 capitalize">{it.module}</p>
                      <p className="font-semibold text-black">{it.product_name}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-black/60">
                        {it.color && <span className="rounded-full bg-black/5 px-2 py-0.5">Colour: {it.color}</span>}
                        {it.size && <span className="rounded-full bg-black/5 px-2 py-0.5">Size: {it.size}</span>}
                        {it.gender && <span className="rounded-full bg-black/5 px-2 py-0.5">{it.gender}</span>}
                        {it.class_name && <span className="rounded-full bg-black/5 px-2 py-0.5">{it.class_name}</span>}
                        {it.product_type && <span className="rounded-full bg-[#CF0A0A]/10 text-[#CF0A0A] font-semibold px-2 py-0.5">{it.product_type}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="text-black/60">Qty {it.quantity} · Rs {Number(it.unit_price).toLocaleString()}</span>
                        <span className="font-bold text-black">Rs {Number(it.total_price).toLocaleString()}</span>
                      </div>
                      {canReview && (
                        <div className="mt-3">
                          {rev ? (
                            <div className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-1.5 text-[11px]">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-semibold text-black">Review Submitted</span>
                              <span className="text-black/50">·</span>
                              <span className={`font-semibold uppercase tracking-wider ${
                                rev.status === "approved" ? "text-green-700"
                                : rev.status === "rejected" ? "text-red-600"
                                : rev.status === "deleted" ? "text-black/40"
                                : "text-amber-600"
                              }`}>
                                {rev.status}
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReviewItem(it)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#CF0A0A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a80808]"
                            >
                              <Star className="h-3.5 w-3.5" />
                              Give Review
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-black/5 rounded-3xl p-6">
              <h3 className="text-lg font-bold mb-4">Shipping Address</h3>
              <div className="text-sm text-black/70 space-y-1">
                <p className="font-semibold text-black">{o.full_name}</p>
                <p>{o.address}</p>
                <p>{o.city}{o.postal_code ? `, ${o.postal_code}` : ""}, {o.country}</p>
                <p className="mt-2">{o.phone} · {o.email}</p>
                {o.delivery_note && (
                  <p className="mt-2 rounded-xl bg-black/[0.03] p-3 text-xs">
                    <span className="font-semibold text-black">Note:</span> {o.delivery_note}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-black/5 rounded-3xl p-6 space-y-3 lg:sticky lg:top-24">
            <h3 className="text-lg font-bold mb-2">Summary</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-black/60">Subtotal</span>
              <span className="font-semibold text-black">Rs {Number(o.subtotal).toLocaleString()}</span>
            </div>
            {o.coupon_code && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-xs">
                <p className="font-semibold text-green-800">Coupon Applied</p>
                <p className="mt-1 text-green-700">Coupon Code: <span className="font-bold">{o.coupon_code}</span></p>
                {o.coupon_discount_type === "percentage" ? (
                  <p className="text-green-700">
                    Discount: {Number(o.coupon_discount_value ?? 0)}%
                    <br />Actual Discount: Rs {Number(o.coupon_discount).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-green-700">Discount: Rs {Number(o.coupon_discount).toLocaleString()}</p>
                )}
              </div>
            )}
            {o.coupon_discount > 0 && (
              <div className="flex items-center justify-between text-sm text-green-700">
                <span>Discount</span>
                <span>- Rs {Number(o.coupon_discount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-black/60">Delivery</span>
              <span className="font-semibold text-black">Rs {Number(o.delivery_charge ?? 0).toLocaleString()}</span>
            </div>
            <div className="border-t border-black/10 pt-3 flex items-center justify-between">
              <span className="font-bold text-black">Total</span>
              <span className="text-xl font-bold text-[#CF0A0A]">Rs {Number(o.total).toLocaleString()}</span>
            </div>
            <div className="border-t border-black/10 pt-3 text-xs text-black/60">
              <p className="uppercase tracking-widest text-black/40 text-[10px]">Payment</p>
              <p className="font-semibold text-black mt-1 uppercase">{o.payment_method}</p>
              {o.payment_method === "online" && (
                <p className={`mt-1 text-[11px] font-semibold uppercase tracking-wider ${
                  o.payment_status === "verified" ? "text-green-700"
                  : o.payment_status === "rejected" ? "text-red-600"
                  : "text-amber-600"
                }`}>
                  {o.payment_status === "verified" ? "Verified"
                    : o.payment_status === "rejected" ? "Rejected"
                    : "Pending Verification"}
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
      {reviewItem && (
        <ReviewDialog
          open={!!reviewItem}
          onOpenChange={(v) => !v && setReviewItem(null)}
          orderId={o.id}
          orderNumber={o.order_number}
          item={reviewItem}
        />
      )}
    </SiteLayout>
  );
}

const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "pdf"] as const;

function PaymentRejectedCard({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const uploadFn = useServerFn(uploadPaymentScreenshot);
  const resubmitFn = useServerFn(resubmitPaymentScreenshot);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!file) { toast.error("Please choose a file"); return; }
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext as any)) {
      toast.error("Use JPG, PNG, WEBP, or PDF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5 MB");
      return;
    }
    setSubmitting(true);
    try {
      const dataBase64 = await fileToBase64(file);
      const { path } = await uploadFn({
        data: { fileName: file.name, contentType: file.type || "application/octet-stream", dataBase64 },
      });
      await resubmitFn({ data: { orderId, screenshotPath: path } });
      toast.success("New payment screenshot submitted for verification");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["shop", "order", orderId] });
      qc.invalidateQueries({ queryKey: ["shop", "orders"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/70 p-5">
      <div className="flex items-start gap-3">
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-red-100 text-red-700 shrink-0">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-red-800">Payment Rejected</p>
          <p className="text-sm text-red-700 mt-0.5">Please upload a new payment screenshot.</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-red-200 text-sm font-medium cursor-pointer hover:bg-red-50">
              <Upload className="h-4 w-4" />
              {file ? file.name : "Choose file (JPG, PNG, WEBP, PDF · ≤5MB)"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              disabled={!file || submitting}
              onClick={onSubmit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#CF0A0A] text-white text-sm font-semibold hover:bg-[#a80808] disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
