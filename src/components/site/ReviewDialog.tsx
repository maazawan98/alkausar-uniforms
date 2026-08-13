import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { submitReview } from "@/lib/reviews.functions";
import type { OrderItemSnapshot } from "@/lib/shop.functions";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  orderNumber: string;
  item: OrderItemSnapshot;
};

export function ReviewDialog({ open, onOpenChange, orderId, orderNumber, item }: Props) {
  const qc = useQueryClient();
  const fn = useServerFn(submitReview);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const mut = useMutation({
    mutationFn: async () => {
      if (rating < 1) throw new Error("Please choose a rating");
      if (text.trim().length < 3) throw new Error("Please write a review");
      return fn({
        data: {
          order_id: orderId,
          product_id: item.product_id,
          module: item.module,
          product_name: item.product_name,
          product_image: item.product_image,
          category: null,
          review_title: title.trim() || null,
          review_text: text.trim(),
          rating,
        },
      });
    },
    onSuccess: () => {
      toast.success("Thank you! Your review has been submitted. It will become visible after admin approval.");
      qc.invalidateQueries({ queryKey: ["my-reviews"] });
      onOpenChange(false);
      setTitle("");
      setText("");
      setRating(0);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to submit review"),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => onOpenChange(false)}>
      <div
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#CF0A0A] font-bold">Write Review</p>
            <h2 className="text-xl font-bold text-black mt-0.5">Share your experience</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-2 hover:bg-black/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Product info */}
          <div className="flex gap-3 rounded-2xl bg-[#F7F5F0] p-3">
            <div className="w-16 h-20 shrink-0 rounded-lg bg-white grid place-items-center overflow-hidden">
              {item.product_image ? (
                <img src={item.product_image} alt="" className="w-full h-full object-contain p-1" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-black/40">{item.module}</p>
              <p className="font-semibold text-black truncate">{item.product_name}</p>
              <p className="text-xs text-black/50 mt-1">Order {orderNumber}</p>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-black/60">Rating *</label>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="p-1"
                  >
                    <Star
                      className={`h-8 w-8 transition ${filled ? "fill-amber-400 text-amber-400" : "text-black/20"}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-black/60">Title (optional)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              placeholder="Summarize your experience"
              className="mt-2 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm focus:outline-none focus:border-[#CF0A0A]"
            />
          </div>

          {/* Review */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-black/60">Review *</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="Tell other customers what you thought about this product"
              className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#CF0A0A]"
            />
            <p className="mt-1 text-[11px] text-black/40 text-right">{text.length}/4000</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-black/5 px-6 py-4 bg-[#FAFAFA]">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-black/60 hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-[#CF0A0A] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#a80808] disabled:opacity-60"
          >
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
}
