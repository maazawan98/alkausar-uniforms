import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Loader2, Trash2, ShoppingBag, Sparkles, Tag, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useWishlist, useRemoveWishlist } from "@/hooks/use-shop";
import { AccountModal } from "@/components/site/AccountModal";
import { QuickBuyActions, RatingStars } from "@/components/site/QuickBuyActions";
import type { WishlistItem } from "@/lib/shop.functions";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "My Wishlist | Alkausar Uniforms" },
      { name: "description", content: "Products you've saved for later." },
      { property: "og:title", content: "My Wishlist | Alkausar Uniforms" },
      { property: "og:description", content: "Products you've saved for later." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { user, ready } = useAuthUser();
  const q = useWishlist();
  const remove = useRemoveWishlist();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) setAuthOpen(true);
  }, [ready, user]);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Wishlist"
        title="Your saved products"
        description="Everything you've hearted, in one place."
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-10 sm:py-16">
        {!user ? (
          <EmptyState
            title="Sign in to see your wishlist"
            body="Save products for later — accessible from any device."
            cta={{ label: "Sign in", onClick: () => setAuthOpen(true) }}
          />
        ) : q.isLoading ? (
          <div className="py-32 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#CF0A0A]" /></div>
        ) : (q.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="Your wishlist is empty"
            body="Browse products and tap the heart to save them here."
            cta={{ label: "Browse Products", onClick: () => navigate({ to: "/accessories" }) }}
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {q.data!.map((w) => (
              <WishlistCard
                key={w.id}
                item={w}
                onRemove={() =>
                  remove.mutate(w.id, { onSuccess: () => toast.success("Removed from wishlist") })
                }
              />
            ))}
          </div>
        )}
      </div>
      <AccountModal open={authOpen} onOpenChange={setAuthOpen} />
    </SiteLayout>
  );
}

function WishlistCard({ item: w, onRemove }: { item: WishlistItem; onRemove: () => void }) {
  const hasSale =
    w.sale_price_from != null && w.price_from != null && w.sale_price_from < w.price_from;
  const shownPrice = hasSale ? w.sale_price_from! : w.price_from;
  const discountPct =
    hasSale && w.price_from
      ? Math.round(((w.price_from - w.sale_price_from!) / w.price_from) * 100)
      : null;

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-black/5 overflow-hidden hover:shadow-[0_28px_60px_-28px_rgba(0,0,0,0.28)] transition-shadow">
      <Link to={w.href} className="block relative bg-[#F7F5F0] aspect-square">
        {w.product_image ? (
          <img
            src={w.product_image}
            alt={w.product_name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-contain p-3 sm:p-5"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-black/25">
            <ShoppingBag className="h-9 w-9" />
          </div>
        )}

        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 max-w-[70%]">
          {discountPct != null && discountPct > 0 && (
            <span className="inline-flex items-center rounded-md bg-[#CF0A0A] text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 shadow">
              -{discountPct}%
            </span>
          )}
          {w.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-md bg-black text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 shadow">
              <Sparkles className="h-2.5 w-2.5 shrink-0" /> Featured
            </span>
          )}
          {w.is_deal && !discountPct && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#DC5F00] text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 shadow">
              <Tag className="h-2.5 w-2.5 shrink-0" /> Deal
            </span>
          )}
        </div>

        <span className="absolute top-2 right-2 sm:top-3 sm:right-3 rounded-full bg-white/95 text-black text-[9px] font-bold uppercase tracking-widest px-2 py-1">
          {w.module}
        </span>

        {w.is_out_of_stock && (
          <div className="absolute inset-0 bg-black/55 grid place-items-center px-2">
            <span className="rounded-full bg-white text-black text-[10px] sm:text-[11px] font-semibold px-3 py-1.5">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      <div className="p-3 sm:p-4 flex flex-col flex-1 min-w-0">
        {w.category_name && (
          <p className="text-[10px] uppercase tracking-widest text-black/40 truncate">
            {w.category_name}
          </p>
        )}
        <Link
          to={w.href}
          className="mt-0.5 text-[13px] sm:text-[14px] font-semibold text-black leading-snug line-clamp-2 hover:text-[#CF0A0A] transition-colors min-h-[2.3rem]"
        >
          {w.product_name}
        </Link>

        {w.product_types.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {w.product_types.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full border border-black/10 bg-[#F7F5F0] text-black/70 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-1.5 min-h-[16px] flex items-center">
          {w.rating > 0 && <RatingStars rating={w.rating} />}
        </div>

        {w.quality_tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {w.quality_tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-[#CF0A0A]/[0.07] text-[#CF0A0A] text-[9px] sm:text-[10px] font-semibold px-2 py-0.5"
              >
                <BadgeCheck className="h-2.5 w-2.5 shrink-0" /> {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 min-h-[24px]">
          {shownPrice != null ? (
            <>
              <span className="text-[15px] sm:text-[17px] font-bold text-black">
                Rs {shownPrice.toLocaleString()}
              </span>
              {hasSale && (
                <span className="text-[11px] text-black/40 line-through">
                  Rs {w.price_from!.toLocaleString()}
                </span>
              )}
            </>
          ) : (
            <span className="text-[12px] text-black/40">Price on request</span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-black/5 space-y-2">
          {w.product_types.length > 1 ? (
            <Link
              to={w.href}
              className="w-full inline-flex items-center justify-center rounded-xl bg-[#CF0A0A] text-white text-[12px] sm:text-[13px] font-semibold px-3 py-2.5 hover:bg-[#a80808] transition-colors"
            >
              Select Options
            </Link>
          ) : (
            <QuickBuyActions
              size="sm"
              input={{
                module: w.module,
                productId: w.product_id,
                categoryId: w.category_id,
                productName: w.product_name,
                unitPrice: shownPrice,
                outOfStock: w.is_out_of_stock,
                productType: w.product_types[0] ?? null,
              }}
            />
          )}
          <button
            onClick={onRemove}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 text-black/60 hover:text-[#CF0A0A] hover:border-[#CF0A0A]/40 text-[12px] font-semibold px-3 py-2 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, body, cta }: { title: string; body: string; cta: { label: string; onClick: () => void } }) {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="mx-auto h-20 w-20 rounded-full bg-[#CF0A0A]/10 grid place-items-center">
        <Heart className="h-8 w-8 text-[#CF0A0A]" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-black">{title}</h2>
      <p className="mt-2 text-sm text-black/60">{body}</p>
      <button
        onClick={cta.onClick}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#CF0A0A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#a80808]"
      >
        <ShoppingBag className="h-4 w-4" /> {cta.label}
      </button>
    </div>
  );
}
