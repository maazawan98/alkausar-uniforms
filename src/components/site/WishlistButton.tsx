import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useWishlist, useToggleWishlist } from "@/hooks/use-shop";
import { setPendingAction } from "@/lib/pending-action";
import { openAuthModal } from "@/lib/auth-modal";
import type { ShopModule } from "@/lib/shop.functions";

export function WishlistButton({
  module,
  productId,
  categoryId = null,
  onNeedAuth,
  size = "md",
  className = "",
}: {
  module: ShopModule;
  productId: string;
  categoryId?: string | null;
  onNeedAuth?: () => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const { user } = useAuthUser();
  const { data: wishlist } = useWishlist();
  const toggle = useToggleWishlist();
  const [busy, setBusy] = useState(false);

  const inList = !!wishlist?.find(
    (w) => w.module === module && w.product_id === productId,
  );

  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <button
      type="button"
      aria-label={inList ? "Remove from wishlist" : "Add to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
          setPendingAction({ kind: "wishlist", module, productId, categoryId });
          if (onNeedAuth) onNeedAuth();
          else openAuthModal();
          return;
        }
        setBusy(true);
        toggle.mutate(
          { module, productId, categoryId },
          {
            onSuccess: (res) => {
              toast.success(res.inWishlist ? "Added to wishlist" : "Removed from wishlist");
            },
            onError: () => toast.error("Something went wrong"),
            onSettled: () => setBusy(false),
          },
        );
      }}
      className={[
        "grid place-items-center rounded-full bg-white/95 backdrop-blur border border-black/5 shadow-sm hover:scale-110 transition-transform",
        dim,
        className,
      ].join(" ")}
    >
      {busy ? (
        <Loader2 className={`${icon} animate-spin text-black/50`} />
      ) : (
        <Heart
          className={`${icon} transition-colors ${
            inList ? "fill-[#CF0A0A] text-[#CF0A0A]" : "text-black/60 hover:text-[#CF0A0A]"
          }`}
        />
      )}
    </button>
  );
}
