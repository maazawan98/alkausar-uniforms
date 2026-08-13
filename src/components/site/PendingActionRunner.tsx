import { useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useAuthUser } from "@/hooks/use-auth-user";
import { consumePendingAction } from "@/lib/pending-action";
import { useToggleWishlist, useAddToCart } from "@/hooks/use-shop";
import { setBuyNowLine } from "@/lib/pending-action";
import { subscribeNewsletter, submitContactQuery } from "@/lib/customer-query.functions";
import { useServerFn } from "@tanstack/react-start";

/**
 * Runs any pending action (wishlist, cart, buynow, newsletter, contact) that
 * was saved before the user signed in. Mounted once inside the root component.
 */
export function PendingActionRunner() {
  const { user } = useAuthUser();
  const toggleWish = useToggleWishlist();
  const addCart = useAddToCart();
  const navigate = useNavigate();
  const subscribe = useServerFn(subscribeNewsletter);
  const sendContact = useServerFn(submitContactQuery);

  useEffect(() => {
    if (!user) return;
    const pending = consumePendingAction();
    if (!pending) return;

    const { action, returnTo } = pending;
    (async () => {
      try {
        if (action.kind === "wishlist") {
          await toggleWish.mutateAsync({
            module: action.module,
            productId: action.productId,
            categoryId: action.categoryId,
          });
          toast.success("Added to wishlist");
        } else if (action.kind === "cart") {
          await addCart.mutateAsync(action.line);
          toast.success("Added to cart");
        } else if (action.kind === "buynow") {
          setBuyNowLine(action.line);
          navigate({ to: "/checkout", search: { mode: "buynow" } as any });
          return;
        } else if (action.kind === "newsletter") {
          const res = await subscribe();
          if (res.status === "already") {
            toast.info("You are already subscribed to our newsletter.");
          } else {
            toast.success("Thank you for subscribing!", {
              description: "You will receive updates about our latest collections and offers.",
            });
          }
        } else if (action.kind === "contact") {
          await sendContact({ data: action.payload });
          toast.success("Thank you for contacting us.", {
            description: "We have received your message and will get back to you as soon as possible.",
          });
        }
        if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
          navigate({ to: returnTo }).catch(() => {});
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Could not complete your action. Please try again.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return null;
}
