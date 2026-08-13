import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Star, Printer, Package, ShoppingBag } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { useAuthUser } from "@/hooks/use-auth-user";
import { listMyOrders, type Order, type OrderItemSnapshot } from "@/lib/shop.functions";
import { AccountModal } from "@/components/site/AccountModal";
import { listMyReviewStatuses, type MyReviewStatus } from "@/lib/reviews.functions";
import { OrderDetailsDialog } from "@/components/site/OrderDetailsDialog";
import { ReviewDialog } from "@/components/site/ReviewDialog";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My Orders | Alkausar Uniforms" },
      { name: "description", content: "Track your past and current orders." },
      { property: "og:title", content: "My Orders | Alkausar Uniforms" },
      { property: "og:description", content: "Track your past and current orders." },
    ],
  }),
  component: OrdersPage,
});

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

function OrdersPage() {
  const { user, ready } = useAuthUser();
  const fn = useServerFn(listMyOrders);
  const q = useQuery<Order[]>({
    queryKey: ["shop", "orders"],
    queryFn: () => fn(),
    enabled: !!user,
  });
  const reviewFn = useServerFn(listMyReviewStatuses);
  const reviewsQ = useQuery<Record<string, MyReviewStatus>>({
    queryKey: ["my-reviews"],
    queryFn: () => reviewFn(),
    enabled: !!user,
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [reviewCtx, setReviewCtx] = useState<{ order: Order; item: OrderItemSnapshot } | null>(null);

  useEffect(() => {
    if (ready && !user) setAuthOpen(true);
  }, [ready, user]);

  const orders = q.data ?? [];
  const reviewMap = reviewsQ.data ?? {};

  const nextReviewable = useMemo(() => {
    const byOrder = new Map<string, OrderItemSnapshot>();
    for (const o of orders) {
      if (o.status !== "delivered") continue;
      for (const it of o.items) {
        const key = `${o.id}:${it.product_id}`;
        if (!reviewMap[key]) { byOrder.set(o.id, it); break; }
      }
    }
    return byOrder;
  }, [orders, reviewMap]);

  return (
    <SiteLayout>
      <PageHero eyebrow="Orders" title="My Orders" description="Every order you've placed." />
      <div className="mx-auto max-w-6xl px-4 sm:px-4 sm:px-6 lg:px-10 py-12">
        {!user ? (
          <SignInPrompt onOpen={() => setAuthOpen(true)} />
        ) : q.isLoading ? (
          <SkeletonList />
        ) : orders.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-black/[0.03] text-[10px] uppercase tracking-widest text-black/50">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Order</th>
                    <th className="text-left font-semibold px-4 py-3">Date</th>
                    <th className="text-left font-semibold px-4 py-3">Products</th>
                    <th className="text-left font-semibold px-4 py-3">Payment</th>
                    <th className="text-left font-semibold px-4 py-3">Status</th>
                    <th className="text-right font-semibold px-4 py-3">Total</th>
                    <th className="text-right font-semibold px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const reviewItem = nextReviewable.get(o.id);
                    return (
                      <tr key={o.id} className="border-t border-black/5 hover:bg-black/[0.015]">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-black">{o.order_number}</p>
                          {o.coupon_code && (
                            <span className="text-[10px] font-semibold text-green-700 uppercase tracking-wider">Coupon</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-black/60 whitespace-nowrap">
                          {new Date(o.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-lg bg-[#F7F5F0] overflow-hidden grid place-items-center shrink-0">
                              {o.items[0]?.product_image && (
                                <img src={o.items[0].product_image} alt="" className="h-full w-full object-contain p-0.5" />
                              )}
                            </div>
                            <span className="text-xs text-black/60">
                              {o.items.length} {o.items.length === 1 ? "item" : "items"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-black uppercase">{o.payment_method === "cod" ? "COD" : "Online"}</p>
                          {o.payment_method === "online" && (
                            <p className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${
                              o.payment_status === "verified" ? "text-green-700"
                              : o.payment_status === "rejected" ? "text-red-600"
                              : "text-amber-600"
                            }`}>
                              {o.payment_status === "verified" ? "Verified"
                                : o.payment_status === "rejected" ? "Rejected"
                                : "Pending"}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[o.status] ?? "bg-black/10 text-black/70 border-black/10"}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-black whitespace-nowrap">
                          Rs {Number(o.total).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <IconBtn label="View order" onClick={() => setViewOrder(o)}>
                              <Eye className="h-4 w-4" />
                            </IconBtn>
                            {reviewItem && (
                              <IconBtn
                                label="Give review"
                                accent
                                onClick={() => setReviewCtx({ order: o, item: reviewItem })}
                              >
                                <Star className="h-4 w-4" />
                              </IconBtn>
                            )}
                            <IconBtn label="Print (coming soon)" disabled>
                              <Printer className="h-4 w-4" />
                            </IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {orders.map((o) => {
                const reviewItem = nextReviewable.get(o.id);
                return (
                  <div key={o.id} className="bg-white border border-black/5 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Order</p>
                        <p className="font-bold text-black truncate">{o.order_number}</p>
                        <p className="text-[11px] text-black/50 mt-0.5">
                          {new Date(o.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0 ${STATUS_STYLES[o.status] ?? "bg-black/10 text-black/70 border-black/10"}`}>
                        {o.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 overflow-x-auto">
                      {o.items.slice(0, 4).map((it, i) => (
                        <div key={i} className="h-12 w-12 rounded-lg bg-[#F7F5F0] overflow-hidden grid place-items-center shrink-0">
                          {it.product_image && <img src={it.product_image} alt="" className="h-full w-full object-contain p-0.5" />}
                        </div>
                      ))}
                      {o.items.length > 4 && <span className="text-[11px] text-black/50">+{o.items.length - 4}</span>}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs">
                        <p className="text-black/50">{o.payment_method === "cod" ? "COD" : "Online"} · {o.items.length} items</p>
                        <p className="font-bold text-black text-base mt-0.5">Rs {Number(o.total).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconBtn label="View" onClick={() => setViewOrder(o)}>
                          <Eye className="h-4 w-4" />
                        </IconBtn>
                        {reviewItem && (
                          <IconBtn label="Review" accent onClick={() => setReviewCtx({ order: o, item: reviewItem })}>
                            <Star className="h-4 w-4" />
                          </IconBtn>
                        )}
                        <IconBtn label="Print (coming soon)" disabled>
                          <Printer className="h-4 w-4" />
                        </IconBtn>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <OrderDetailsDialog
        open={!!viewOrder}
        onOpenChange={(v) => !v && setViewOrder(null)}
        order={viewOrder}
      />
      {reviewCtx && (
        <ReviewDialog
          open={!!reviewCtx}
          onOpenChange={(v) => !v && setReviewCtx(null)}
          orderId={reviewCtx.order.id}
          orderNumber={reviewCtx.order.order_number}
          item={reviewCtx.item}
        />
      )}
      <AccountModal open={authOpen} onOpenChange={setAuthOpen} />
    </SiteLayout>
  );
}

function IconBtn({
  children, label, onClick, disabled, accent,
}: { children: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean; accent?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid place-items-center h-9 w-9 rounded-full border transition ${
        disabled
          ? "border-black/5 text-black/25 cursor-not-allowed"
          : accent
            ? "border-[#CF0A0A]/20 bg-[#CF0A0A]/5 text-[#CF0A0A] hover:bg-[#CF0A0A] hover:text-white"
            : "border-black/10 text-black/70 hover:bg-black hover:text-white hover:border-black"
      }`}
    >
      {children}
    </button>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-black/5 rounded-2xl p-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-black/5" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 rounded bg-black/5" />
              <div className="h-3 w-24 rounded bg-black/5" />
            </div>
            <div className="h-6 w-20 rounded-full bg-black/5" />
            <div className="h-5 w-20 rounded bg-black/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="mx-auto h-24 w-24 rounded-3xl bg-gradient-to-br from-[#CF0A0A]/10 to-[#CF0A0A]/5 grid place-items-center">
        <ShoppingBag className="h-10 w-10 text-[#CF0A0A]" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-black">You haven't placed any orders yet.</h2>
      <p className="mt-2 text-sm text-black/60">Start shopping to see your orders here.</p>
      <Link
        to="/accessories"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#CF0A0A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#a80808]"
      >
        Continue Shopping
      </Link>
    </div>
  );
}

function SignInPrompt({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="text-center py-24">
      <div className="mx-auto h-20 w-20 rounded-full bg-[#CF0A0A]/10 grid place-items-center">
        <Package className="h-8 w-8 text-[#CF0A0A]" />
      </div>
      <p className="mt-6 text-black/60">Please sign in to view your orders.</p>
      <button onClick={onOpen} className="mt-4 rounded-full bg-[#CF0A0A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#a80808]">
        Sign in
      </button>
    </div>
  );
}
