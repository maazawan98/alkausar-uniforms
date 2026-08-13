import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listWishlist,
  listCart,
  toggleWishlist,
  removeWishlist,
  addToCart,
  updateCartQty,
  removeCartItem,
  getCustomerProfile,
  type WishlistItem,
  type CartItem,
  type CustomerProfile,
} from "@/lib/shop.functions";
import { useAuthUser } from "@/hooks/use-auth-user";

export const WISHLIST_KEY = ["shop", "wishlist"] as const;
export const CART_KEY = ["shop", "cart"] as const;
export const PROFILE_KEY = ["shop", "profile"] as const;

export function useWishlist() {
  const { user } = useAuthUser();
  const fn = useServerFn(listWishlist);
  return useQuery<WishlistItem[]>({
    queryKey: WISHLIST_KEY,
    queryFn: () => fn(),
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useCart() {
  const { user } = useAuthUser();
  const fn = useServerFn(listCart);
  return useQuery<CartItem[]>({
    queryKey: CART_KEY,
    queryFn: () => fn(),
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useProfile() {
  const { user } = useAuthUser();
  const fn = useServerFn(getCustomerProfile);
  return useQuery<CustomerProfile>({
    queryKey: PROFILE_KEY,
    queryFn: () => fn(),
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useToggleWishlist() {
  const qc = useQueryClient();
  const fn = useServerFn(toggleWishlist);
  return useMutation({
    mutationFn: (v: { module: any; productId: string; categoryId?: string | null }) =>
      fn({ data: v as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: WISHLIST_KEY }),
  });
}

export function useRemoveWishlist() {
  const qc = useQueryClient();
  const fn = useServerFn(removeWishlist);
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: WISHLIST_KEY }),
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  const fn = useServerFn(addToCart);
  return useMutation({
    mutationFn: (line: any) => fn({ data: line }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CART_KEY }),
  });
}

export function useUpdateCartQty() {
  const qc = useQueryClient();
  const fn = useServerFn(updateCartQty);
  return useMutation({
    mutationFn: (v: { id: string; quantity: number }) => fn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CART_KEY }),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  const fn = useServerFn(removeCartItem);
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CART_KEY }),
  });
}
