import { Link } from "@tanstack/react-router";
import { ShoppingBag, Sparkles, Tag, Users } from "lucide-react";
import type { BrowseCard } from "@/lib/browse.functions";
import { WishlistButton } from "@/components/site/WishlistButton";
import { QuickBuyActions, RatingStars } from "@/components/site/QuickBuyActions";
import type { ShopModule } from "@/lib/shop.functions";

export function ProductBrowseCard({
  product,
  hrefBase,
  module,
  categoryId = null,
}: {
  product: BrowseCard;
  hrefBase: string;
  module?: ShopModule;
  categoryId?: string | null;
}) {
  const hasSale =
    product.salePriceFrom != null &&
    product.priceFrom != null &&
    product.salePriceFrom < product.priceFrom;
  const shownPrice = hasSale ? product.salePriceFrom! : product.priceFrom;
  const discountPct =
    hasSale && product.priceFrom
      ? Math.round(((product.priceFrom - product.salePriceFrom!) / product.priceFrom) * 100)
      : null;
  const gender = product.genders[0] ?? null;
  const hasSecondary = !!product.secondaryImageUrl;

  return (
    <div className="group relative rounded-2xl sm:rounded-3xl bg-white border border-black/5 overflow-hidden hover:-translate-y-1 hover:shadow-[0_28px_60px_-28px_rgba(0,0,0,0.28)] transition-all duration-300 flex flex-col">
      {/* Image → link */}
      <Link
        to={`${hrefBase}/$id` as any}
        params={{ id: product.id } as any}
        className="relative aspect-square min-h-[150px] bg-[#F7F7F7] overflow-hidden block"
      >
        {product.primaryImageUrl ? (
          <>
            <img
              src={product.primaryImageUrl}
              alt={product.name}
              loading="lazy"
              className={`absolute inset-0 w-full h-full object-contain p-1.5 sm:p-2.5 transition-all duration-500 ${
                hasSecondary ? "md:group-hover:opacity-0" : "group-hover:scale-105"
              }`}
            />
            {hasSecondary && (
              <img
                src={product.secondaryImageUrl!}
                alt={product.name}
                loading="lazy"
                aria-hidden
                className="hidden md:block absolute inset-0 w-full h-full object-contain p-2.5 opacity-0 md:group-hover:opacity-100 transition-opacity duration-500"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-black/20">
            <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
        )}

        {/* Left badges */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 sm:gap-1.5 max-w-[55%]">
          {discountPct != null && discountPct > 0 && (
            <span className="inline-flex items-center rounded-md sm:rounded-full bg-[#CF0A0A] text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 shadow leading-tight">
              -{discountPct}%
            </span>
          )}
          {product.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-md sm:rounded-full bg-black text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 sm:px-2 sm:py-1 shadow leading-tight">
              <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" /> Featured
            </span>
          )}
          {product.is_deal && !discountPct && (
            <span className="inline-flex items-center gap-1 rounded-md sm:rounded-full bg-[#DC5F00] text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 sm:px-2 sm:py-1 shadow leading-tight">
              <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" /> Deal
            </span>
          )}
        </div>

        {gender && (
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 max-w-[60%]">
            <span className="inline-flex items-center gap-1 rounded-md sm:rounded-full bg-white/95 backdrop-blur text-black text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 sm:px-2 sm:py-1 shadow-sm leading-tight truncate">
              <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" /> {gender}
            </span>
          </div>
        )}

        {module && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
            <WishlistButton module={module} productId={product.id} categoryId={categoryId} size="sm" />
          </div>
        )}

        {product.is_out_of_stock && (
          <div className="absolute inset-0 bg-black/55 grid place-items-center px-2">
            <span className="rounded-full bg-white text-black text-[10px] sm:text-[11px] font-semibold px-3 py-1.5 text-center">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1 min-w-0">
        <Link
          to={`${hrefBase}/$id` as any}
          params={{ id: product.id } as any}
          className="block group/name min-w-0"
        >
          <h3 className="text-[13px] sm:text-[14px] font-semibold text-black leading-snug line-clamp-2 break-words group-hover/name:text-[#CF0A0A] transition-colors min-h-[2.1rem] sm:min-h-[2.2rem]">
            {product.name}
          </h3>
        </Link>

        {/* Product Types */}
        {product.product_types.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {product.product_types.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full border border-black/10 bg-[#F7F5F0] text-black/70 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 leading-tight"
              >
                {t}
              </span>
            ))}
            {product.product_types.length > 3 && (
              <span className="text-[10px] font-semibold text-black/50">
                +{product.product_types.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Rating */}
        <div className="mt-1 min-h-[14px] flex items-center whitespace-nowrap overflow-hidden">
          {product.rating > 0 && <RatingStars rating={product.rating} size={11} />}
        </div>

        {/* Colours */}
        {product.colors.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {product.colors.slice(0, 5).map((c) => (
              <span
                key={c.hex + c.name}
                title={c.name}
                className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10 shadow-sm"
                style={{ backgroundColor: c.hex }}
              />
            ))}
            {product.colors.length > 5 && (
              <span className="text-[10px] font-semibold text-black/50">
                +{product.colors.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-h-[22px]">
          {shownPrice != null ? (
            <>
              <span className="text-[16px] sm:text-[18px] font-extrabold text-black tracking-tight">
                Rs {shownPrice.toLocaleString()}
              </span>
              {hasSale && (
                <span className="text-[11px] sm:text-[12px] text-black/40 line-through">
                  Rs {product.priceFrom!.toLocaleString()}
                </span>
              )}
            </>
          ) : (
            <span className="text-[12px] text-black/40">Price on request</span>
          )}
        </div>


        {/* Actions */}
        {module && product.product_types.length > 1 ? (
          <div className="mt-2.5 pt-2.5 border-t border-black/5">
            <Link
              to={`${hrefBase}/$id` as any}
              params={{ id: product.id } as any}
              className="w-full inline-flex items-center justify-center rounded-xl bg-[#CF0A0A] text-white text-[12px] sm:text-[13px] font-semibold px-3 py-2.5 hover:bg-[#a80808] transition-colors"
            >
              Select Options
            </Link>
          </div>
        ) : module ? (
          <div className="mt-2.5 pt-2.5 border-t border-black/5">
            <QuickBuyActions
              size="sm"
              input={{
                module,
                productId: product.id,
                categoryId,
                productName: product.name,
                productImagePath: product.primaryImageUrl,
                unitPrice: shownPrice,
                color: product.colors[0]?.name ?? null,
                size: product.sizes[0] ?? null,
                gender: product.genders[0] ?? null,
                className: product.classes[0] ?? null,
                outOfStock: product.is_out_of_stock,
                productType: product.product_types[0] ?? null,
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
