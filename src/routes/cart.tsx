import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingBag, Loader2, Trash2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useCart, useRemoveCartItem, useUpdateCartQty } from "@/hooks/use-shop";
import { AccountModal } from "@/components/site/AccountModal";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "My Cart | Alkausar Uniforms" },
      { name: "description", content: "Review the items in your cart before checkout." },
      { property: "og:title", content: "My Cart | Alkausar Uniforms" },
      { property: "og:description", content: "Review the items in your cart before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { user, ready } = useAuthUser();
  const q = useCart();
  const remove = useRemoveCartItem();
  const updateQty = useUpdateCartQty();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) setAuthOpen(true);
  }, [ready, user]);

  const items = q.data ?? [];
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Cart"
        title="Your shopping cart"
        description="Review your items and proceed to checkout when ready."
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16">
        {!user ? (
          <Empty title="Sign in to view your cart" ctaLabel="Sign in" onCta={() => setAuthOpen(true)} />
        ) : q.isLoading ? (
          <div className="py-32 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#CF0A0A]" /></div>
        ) : items.length === 0 ? (
          <Empty title="Your cart is empty" body="Add products from the storefront to get started." ctaLabel="Browse Products" onCta={() => navigate({ to: "/accessories" })} />
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
            <div className="space-y-3">
              {items.map((i) => (
                <div key={i.id} className="flex gap-3 sm:gap-4 bg-white border border-black/5 rounded-2xl p-3 sm:p-4">
                  <Link to={i.href} className="shrink-0 w-20 h-24 sm:w-24 sm:h-28 rounded-xl bg-[#F7F5F0] overflow-hidden grid place-items-center">
                    {i.product_image ? (
                      <img src={i.product_image} alt={i.product_name} className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <span className="text-black/30 text-[10px]">No image</span>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-widest text-black/40">{i.module}</p>
                        <Link to={i.href} className="text-sm font-semibold text-black hover:text-[#CF0A0A] line-clamp-2">
                          {i.product_name}
                        </Link>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm("Remove this item?"))
                            remove.mutate(i.id, { onSuccess: () => toast.success("Item removed") });
                        }}
                        className="h-8 w-8 rounded-full grid place-items-center text-black/40 hover:text-[#CF0A0A] hover:bg-[#CF0A0A]/10"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-black/60">
                      {i.color && <span className="rounded-full bg-black/5 px-2 py-0.5">Colour: {i.color}</span>}
                      {i.size && <span className="rounded-full bg-black/5 px-2 py-0.5">Size: {i.size}</span>}
                      {i.gender && <span className="rounded-full bg-black/5 px-2 py-0.5">{i.gender}</span>}
                      {i.class_name && <span className="rounded-full bg-black/5 px-2 py-0.5">{i.class_name}</span>}
                      {i.product_type && (
                        <span className="rounded-full bg-[#CF0A0A]/10 text-[#CF0A0A] font-semibold px-2 py-0.5">
                          {i.product_type}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-xl border border-black/10 overflow-hidden">
                        <button
                          onClick={() => updateQty.mutate({ id: i.id, quantity: Math.max(1, i.quantity - 1) })}
                          className="h-8 w-8 grid place-items-center hover:bg-black/5"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="h-8 w-10 grid place-items-center text-sm font-semibold border-x border-black/10">
                          {i.quantity}
                        </span>
                        <button
                          onClick={() => updateQty.mutate({ id: i.id, quantity: Math.min(99, i.quantity + 1) })}
                          className="h-8 w-8 grid place-items-center hover:bg-black/5"
                          aria-label="Increase"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-black">
                        Rs {(i.unit_price * i.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:sticky lg:top-24 bg-white border border-black/5 rounded-3xl p-4 sm:p-6 space-y-4">
              <h3 className="text-lg font-bold text-black">Order Summary</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-black/60">Subtotal</span>
                <span className="font-semibold text-black">Rs {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-black/60">Items</span>
                <span className="font-semibold text-black">
                  {items.reduce((n, i) => n + i.quantity, 0)}
                </span>
              </div>
              <p className="text-[12px] text-black/50 leading-relaxed">
                Coupons and delivery charges are applied at checkout.
              </p>
              <div className="border-t border-black/10 pt-4 flex items-center justify-between">
                <span className="font-bold text-black">Total</span>
                <span className="text-xl font-bold text-[#CF0A0A]">Rs {subtotal.toLocaleString()}</span>
              </div>
              <button
                onClick={() => navigate({ to: "/checkout" })}
                className="w-full h-12 rounded-2xl bg-[#CF0A0A] text-white text-sm font-semibold hover:bg-[#a80808] inline-flex items-center justify-center gap-2"
              >
                <ShoppingBag className="h-4 w-4" /> Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
      <AccountModal open={authOpen} onOpenChange={setAuthOpen} />
    </SiteLayout>
  );
}

function Empty({ title, body, ctaLabel, onCta }: { title: string; body?: string; ctaLabel: string; onCta: () => void }) {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="mx-auto h-20 w-20 rounded-full bg-[#CF0A0A]/10 grid place-items-center">
        <ShoppingBag className="h-8 w-8 text-[#CF0A0A]" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-black">{title}</h2>
      {body && <p className="mt-2 text-sm text-black/60">{body}</p>}
      <button onClick={onCta} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#CF0A0A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#a80808]">
        {ctaLabel}
      </button>
    </div>
  );
}
