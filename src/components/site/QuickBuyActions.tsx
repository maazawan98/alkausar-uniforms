import { Loader2, ShoppingBag, Zap } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useAddToCart } from "@/hooks/use-shop";
import { setPendingAction, setBuyNowLine } from "@/lib/pending-action";
import { openAuthModal } from "@/lib/auth-modal";
import type { CartLineInput, ShopModule } from "@/lib/shop.functions";

export type QuickBuyInput = {
  module: ShopModule;
  productId: string;
  categoryId?: string | null;
  productName: string;
  productImagePath?: string | null;
  unitPrice: number | null;
  color?: string | null;
  size?: string | null;
  gender?: string | null;
  className?: string | null;
  outOfStock?: boolean;
  productType?: string | null;
};

/**
 * Compact two-button quick action bar: Add to Cart + Buy Now.
 * Safe to place inside a Link — every button stops propagation.
 */
export function QuickBuyActions({
  input,
  layout = "grid",
  size = "md",
}: {
  input: QuickBuyInput;
  layout?: "grid" | "stack";
  size?: "sm" | "md";
}) {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const addToCartMut = useAddToCart();

  const disabled = !!input.outOfStock || input.unitPrice == null;

  const buildLine = (): CartLineInput => ({
    module: input.module,
    productId: input.productId,
    categoryId: input.categoryId ?? null,
    quantity: 1,
    color: input.color ?? null,
    size: input.size ?? null,
    gender: input.gender ?? null,
    className: input.className ?? null,
    productType: input.productType ?? null,
    unitPrice: input.unitPrice ?? 0,
    productName: input.productName,
    productImagePath: input.productImagePath ?? null,
  });

  const handleCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    const line = buildLine();
    if (!user) {
      setPendingAction({ kind: "cart", line });
      openAuthModal();
      return;
    }
    addToCartMut.mutate(line, {
      onSuccess: () => toast.success("Added to cart"),
      onError: () => toast.error("Could not add to cart"),
    });
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    const line = buildLine();
    if (!user) {
      setPendingAction({ kind: "buynow", line });
      openAuthModal();
      return;
    }
    setBuyNowLine(line);
    navigate({ to: "/checkout", search: { mode: "buynow" } as any });
  };

  const h = size === "sm" ? "h-9" : "h-9 @[240px]:h-10";
  const text = size === "sm" ? "text-[10.5px]" : "text-[10.5px] @[240px]:text-[11.5px]";

  const base = [
    h,
    text,
    "w-full min-w-0 px-1.5 rounded-lg font-semibold tracking-tight inline-flex items-center justify-center gap-1 whitespace-nowrap leading-none transition-all",
  ].join(" ");

  return (
    <div
      className={
        layout === "grid"
          ? "@container grid grid-cols-1 @[200px]:grid-cols-2 gap-1.5 w-full"
          : "@container flex flex-col gap-1.5 w-full"
      }
    >
      <button
        type="button"
        onClick={handleCart}
        disabled={disabled || addToCartMut.isPending}
        className={[
          base,
          disabled
            ? "bg-black/[0.06] text-black/40 cursor-not-allowed"
            : "bg-black text-white hover:bg-[#111]",
        ].join(" ")}
      >
        {addToCartMut.isPending ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
        ) : (
          <ShoppingBag className="h-3 w-3 shrink-0" />
        )}
        Add to Cart
      </button>
      <button
        type="button"
        onClick={handleBuy}
        disabled={disabled}
        className={[
          base,
          disabled
            ? "bg-black/[0.06] text-black/40 cursor-not-allowed"
            : "bg-[#CF0A0A] text-white hover:bg-[#a80808] shadow-[0_10px_24px_-12px_rgba(207,10,10,0.55)]",
        ].join(" ")}
      >
        <Zap className="h-3 w-3 shrink-0" />
        Buy Now
      </button>
    </div>
  );
}


/** Compact 5-star rating with optional numeric label. */
export function RatingStars({
  rating,
  size = 12,
  showValue = true,
}: {
  rating: number;
  size?: number;
  showValue?: boolean;
}) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((n) => (
          <svg
            key={n}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={n <= rounded ? "fill-[#DC5F00]" : "fill-black/15"}
            aria-hidden
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      {showValue && rating > 0 && (
        <span className="text-[11px] font-semibold text-black/70">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
