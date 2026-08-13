import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ChevronRight,
  Minus,
  Plus,
  Ruler,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  X,
  
  Users,
  GraduationCap,
  Zap,
  Heart,
  Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ProductDetails, PDRelated } from "@/lib/product-details.functions";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useWishlist, useToggleWishlist, useAddToCart } from "@/hooks/use-shop";
import { setPendingAction, setBuyNowLine } from "@/lib/pending-action";
import { openAuthModal } from "@/lib/auth-modal";
import type { CartLineInput } from "@/lib/shop.functions";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProductReviews, type PublicReview } from "@/lib/reviews.functions";


/* ---------------- Gallery ---------------- */

function Gallery({ images, name }: { images: ProductDetails["images"]; name: string }) {
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [pausedUntil, setPausedUntil] = useState(0);
  const has = images.length > 0;
  const current = has ? images[active] : null;

  // Auto-rotate every 6s when multiple images exist; manual pick pauses for 10s.
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => {
      if (Date.now() < pausedUntil) return;
      setActive((i) => (i + 1) % images.length);
    }, 6000);
    return () => clearInterval(t);
  }, [images.length, pausedUntil]);


  return (
    <div>
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-[#F7F7F7] border border-black/5"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setHover(null)}
      >
        {current ? (
          <img
            key={current.id}
            src={current.url}
            alt={name}
            className="absolute inset-0 w-full h-full object-contain p-6 transition-transform duration-300 ease-out will-change-transform animate-in fade-in duration-300"
            style={
              hover
                ? { transformOrigin: `${hover.x}% ${hover.y}%`, transform: "scale(1.6)" }
                : undefined
            }
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-black/20">
            <ShoppingBag className="h-16 w-16" />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-3">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => {
                setActive(idx);
                setPausedUntil(Date.now() + 10000);
              }}
              className={[
                "relative aspect-square rounded-2xl overflow-hidden bg-[#F7F7F7] border transition-all",
                idx === active
                  ? "border-[#CF0A0A] ring-2 ring-[#CF0A0A]/20"
                  : "border-black/5 hover:border-black/20",
              ].join(" ")}
              aria-label={`View image ${idx + 1}`}
            >
              <img src={img.url} alt="" className="absolute inset-0 w-full h-full object-contain p-2" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Size Guide Modal ---------------- */

function SizeGuideModal({
  open,
  onClose,
  guides,
  selectedSize,
}: {
  open: boolean;
  onClose: () => void;
  guides: ProductDetails["sizingGuides"];
  selectedSize?: string | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[#CF0A0A]/10 grid place-items-center">
              <Ruler className="h-4 w-4 text-[#CF0A0A]" />
            </div>
            <h3 className="text-base font-semibold">Size Guide</h3>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-black/5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-8">
          {guides.map((g) => (
            <div key={g.label}>
              <div className="flex items-baseline justify-between mb-3">
                <h4 className="text-lg font-bold">{g.label}</h4>
                <span className="text-[11px] uppercase tracking-widest text-black/50">
                  Measurements in {g.unit}
                </span>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-black/5">
                <table className="w-full text-sm">
                  <thead className="bg-[#F7F7F7]">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-black/70">Size</th>
                      {g.measurement_labels.map((ml) => (
                        <th key={ml} className="text-left px-4 py-3 font-semibold text-black/70">
                          {ml}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => {
                      const isSel = selectedSize != null && r.size === selectedSize;
                      return (
                        <tr
                          key={r.size}
                          className={[
                            "border-t transition-colors",
                            isSel
                              ? "border-[#CF0A0A]/40 bg-[#CF0A0A]/[0.06] outline outline-2 -outline-offset-2 outline-[#CF0A0A]"
                              : "border-black/5",
                          ].join(" ")}
                        >
                          <td className={`px-4 py-3 font-semibold ${isSel ? "text-[#CF0A0A]" : ""}`}>
                            <span className="inline-flex items-center gap-2">
                              {r.size}
                              {isSel && (
                                <span className="rounded-full bg-[#CF0A0A] text-white text-[10px] font-bold px-2 py-0.5">
                                  Selected Size
                                </span>
                              )}
                            </span>
                          </td>
                          {r.values.map((v, i) => (
                            <td
                              key={i}
                              className={`px-4 py-3 ${isSel ? "text-black font-medium" : "text-black/70"}`}
                            >
                              {v == null ? "—" : v}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Related ---------------- */

function RelatedCard({ p, hrefBase }: { p: PDRelated; hrefBase: string }) {
  const hasSale = p.salePriceFrom != null && p.priceFrom != null && p.salePriceFrom < p.priceFrom;
  return (
    <Link
      to={`${hrefBase}/$id` as any}
      params={{ id: p.id } as any}
      className="group relative rounded-2xl sm:rounded-3xl bg-white border border-black/5 overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.2)] transition-all duration-300 block"
    >
      <div className="relative aspect-[4/5] bg-[#F7F7F7] overflow-hidden">
        {p.primaryImageUrl ? (
          <img src={p.primaryImageUrl} alt={p.name} loading="lazy" className="absolute inset-0 w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-black/20">
            <ShoppingBag className="h-10 w-10" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {p.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#DC5F00] text-white text-[10px] font-semibold px-2 py-1 shadow">
              <Sparkles className="h-3 w-3" /> Featured
            </span>
          )}
          {p.is_deal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#CF0A0A] text-white text-[10px] font-semibold px-2 py-1 shadow">
              <Tag className="h-3 w-3" /> Deal
            </span>
          )}
        </div>
        {p.is_out_of_stock && (
          <div className="absolute inset-0 bg-black/50 grid place-items-center">
            <span className="rounded-full bg-white text-black text-[11px] font-semibold px-3 py-1.5">
              Out of Stock
            </span>
          </div>
        )}
      </div>
      <div className="p-2.5 sm:p-3">
        <h4 className="text-[13px] sm:text-[14px] font-semibold text-black leading-snug line-clamp-2">{p.name}</h4>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            {p.priceFrom != null ? (
              <div className="flex items-baseline gap-2">
                {hasSale && (
                  <span className="text-[12px] text-black/40 line-through">
                    Rs {p.priceFrom.toLocaleString()}
                  </span>
                )}
                <span className="text-[16px] font-bold text-black">
                  Rs {(hasSale ? p.salePriceFrom! : p.priceFrom).toLocaleString()}
                </span>
              </div>
            ) : (
              <span className="text-xs text-black/40">Price on request</span>
            )}
          </div>
          {p.rating > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-black/60">
              <Star className="h-3 w-3 fill-[#DC5F00] text-[#DC5F00]" />
              <span className="font-semibold text-black">{p.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ---------------- Main view ---------------- */

export function ProductDetailsView({
  product,
  hrefBaseForRelated,
}: {
  product: ProductDetails;
  hrefBaseForRelated: string;
}) {
  // One-time attention wave, ~3s after the page settles
  const [wave, setWave] = useState(false);
  useEffect(() => {
    setWave(false);
    let offTimer = 0;
    let interval = 0;
    const run = () => {
      setWave(true);
      offTimer = window.setTimeout(() => setWave(false), 2900);
    };
    const kickoff = window.setTimeout(() => {
      run();
      interval = window.setInterval(run, 6000);
    }, 2500);
    return () => {
      window.clearTimeout(kickoff);
      window.clearTimeout(offTimer);
      window.clearInterval(interval);
    };
  }, [product.id]);

  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.sizes[0]?.size ?? null,
  );
  const [selectedColour, setSelectedColour] = useState<string | null>(
    product.colours[0]?.hex_code ?? null,
  );
  const [qty, setQty] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);
  const productTypes = product.product_types ?? [];
  const [selectedType, setSelectedType] = useState<string | null>(
    productTypes.length === 1 ? productTypes[0]! : null,
  );

  const currentSize = useMemo(
    () => product.sizes.find((s) => s.size === selectedSize) ?? product.sizes[0] ?? null,
    [selectedSize, product.sizes],
  );

  const classLabelById = useMemo(
    () => new Map(product.classes.map((c) => [c.id, c.label])),
    [product.classes],
  );
  const selectedSizeClasses = useMemo(
    () =>
      (currentSize?.classIds ?? [])
        .map((id) => ({ id, label: classLabelById.get(id) }))
        .filter((c): c is { id: string; label: string } => !!c.label),
    [currentSize, classLabelById],
  );


  const displayPrice = currentSize
    ? currentSize.sale_price ?? currentSize.price
    : null;
  const strikePrice =
    currentSize && currentSize.sale_price != null && currentSize.sale_price < currentSize.price
      ? currentSize.price
      : null;
  const discountPct =
    strikePrice && displayPrice
      ? Math.round(((strikePrice - displayPrice) / strikePrice) * 100)
      : null;

  const oos = product.is_out_of_stock;

  /* ---- Shopping wiring ---- */
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const { data: wishlist } = useWishlist();
  const toggleWish = useToggleWishlist();
  const addToCartMut = useAddToCart();
  const inWishlist = !!wishlist?.find(
    (w) => w.module === product.module && w.product_id === product.id,
  );
  const primaryImgUrl = product.images[0]?.url ?? null;
  const selectedColourName =
    product.colours.find((c) => c.hex_code === selectedColour)?.colour_name ?? null;
  const selectedGender = product.genders[0] ?? null;
  const selectedClassName =
    selectedSizeClasses[0]?.label ?? product.classes[0]?.label ?? null;
  const categoryId = product.category?.id ?? null;

  const buildLine = (): CartLineInput | null => {
    const unit = displayPrice ?? 0;
    return {
      module: product.module,
      productId: product.id,
      categoryId,
      quantity: qty,
      color: selectedColourName,
      size: selectedSize,
      gender: selectedGender,
      className: selectedClassName,
      productType: selectedType,
      unitPrice: unit,
      productName: product.name,
      productImagePath: primaryImgUrl,
    };
  };

  const handleWishlist = () => {
    if (!user) {
      setPendingAction({
        kind: "wishlist",
        module: product.module,
        productId: product.id,
        categoryId,
      });
      openAuthModal();
      return;
    }
    toggleWish.mutate(
      { module: product.module, productId: product.id, categoryId },
      {
        onSuccess: (res) =>
          toast.success(res.inWishlist ? "Added to wishlist" : "Removed from wishlist"),
        onError: () => toast.error("Something went wrong"),
      },
    );
  };

  const requireType = () => {
    if (productTypes.length > 0 && !selectedType) {
      toast.error("Please select a product type");
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!requireType()) return;
    const line = buildLine();
    if (!line) return;
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

  const handleBuyNow = () => {
    if (!requireType()) return;
    const line = buildLine();
    if (!line) return;
    if (!user) {
      setPendingAction({ kind: "buynow", line });
      openAuthModal();
      return;
    }
    setBuyNowLine(line);
    navigate({ to: "/checkout", search: { mode: "buynow" } as any });
  };



  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-black/5">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-5 flex items-center gap-1.5 text-xs text-black/50 flex-wrap">
          <Link to="/" className="hover:text-[#CF0A0A] transition-colors">
            Home
          </Link>
          {product.breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-black/25" />
              <span className={i === product.breadcrumbs.length - 1 ? "text-black font-medium" : ""}>
                {b.label}
              </span>
            </span>
          ))}
          <ChevronRight className="h-3 w-3 text-black/25" />
          <span className="text-black font-medium truncate">{product.name}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left */}
          <Gallery images={product.images} name={product.name} />

          {/* Right */}
          <div
            className={`pd-stagger ${wave ? "pd-wave" : ""} lg:sticky lg:top-24 lg:self-start space-y-6`}
          >
            {/* Badges */}
            {(product.is_featured || product.is_deal || oos) && (
              <div className="flex flex-wrap gap-2">
                {product.is_featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#DC5F00] text-white text-[11px] font-semibold px-3 py-1.5">
                    <Sparkles className="h-3 w-3" /> Featured
                  </span>
                )}
                {product.is_deal && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#CF0A0A] text-white text-[11px] font-semibold px-3 py-1.5">
                    <Tag className="h-3 w-3" /> Deal
                  </span>
                )}
                {oos && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black text-white text-[11px] font-semibold px-3 py-1.5">
                    Out of Stock
                  </span>
                )}
              </div>
            )}

            {product.category && (
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#CF0A0A] font-semibold">
                {product.category.name}
              </p>
            )}

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black leading-tight">
              {product.name}
            </h1>

            {product.rating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-4 w-4 ${
                        n <= Math.round(product.rating)
                          ? "fill-[#DC5F00] text-[#DC5F00]"
                          : "text-black/15"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-black">{product.rating.toFixed(1)}</span>
              </div>
            )}

            {/* Price */}
            {displayPrice != null && (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-black">
                  Rs {displayPrice.toLocaleString()}
                </span>
                {strikePrice && (
                  <>
                    <span className="text-lg text-black/40 line-through">
                      Rs {strikePrice.toLocaleString()}
                    </span>
                    <span className="rounded-full bg-[#CF0A0A]/10 text-[#CF0A0A] text-xs font-bold px-2.5 py-1">
                      -{discountPct}%
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Quality Tags */}
            {product.quality_tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.quality_tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-lg bg-black text-white text-[10px] font-bold tracking-wider px-2.5 py-1.5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Colours */}
            {product.colours.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-2">
                  Colour
                  {selectedColour && (
                    <span className="ml-2 text-black/70 normal-case tracking-normal">
                      {product.colours.find((c) => c.hex_code === selectedColour)?.colour_name}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {product.colours.map((c) => {
                    const active = c.hex_code === selectedColour;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        title={c.colour_name}
                        onClick={() => setSelectedColour(c.hex_code)}
                        className={[
                          "h-9 w-9 rounded-full border-2 transition-all",
                          active
                            ? "border-[#CF0A0A] ring-2 ring-[#CF0A0A]/20 scale-110"
                            : "border-black/10 hover:border-black/30",
                        ].join(" ")}
                        style={{ backgroundColor: c.hex_code }}
                        aria-label={c.colour_name}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product Types */}
            {productTypes.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-2">
                  Product Type
                  {selectedType && (
                    <span className="ml-2 text-black/70 normal-case tracking-normal">
                      {selectedType}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {productTypes.map((t) => {
                    const active = t === selectedType;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedType(active ? null : t)}
                        className={[
                          "h-11 rounded-xl px-4 text-sm font-semibold border transition-all",
                          active
                            ? "border-[#CF0A0A] bg-[#CF0A0A] text-white shadow-[0_8px_20px_-10px_rgba(207,10,10,0.6)]"
                            : "border-black/10 bg-white text-black hover:border-black/40",
                        ].join(" ")}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                {!selectedType && (
                  <p className="mt-2 text-[12px] text-[#CF0A0A]">
                    Select a product type to continue.
                  </p>
                )}
              </div>
            )}

            {/* Sizes */}
            {product.sizes.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-black/50">
                    Size
                    {selectedSize && (
                      <span className="ml-2 text-black/70 normal-case tracking-normal">
                        {selectedSize}
                      </span>
                    )}
                  </div>
                  {product.sizingGuides.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setGuideOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-[#CF0A0A] text-[#CF0A0A] hover:bg-[#CF0A0A] hover:text-white text-[12px] font-bold px-3.5 py-2 transition-colors"
                    >
                      <Ruler className="h-4 w-4" /> View Size Guide
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => {
                    const active = s.size === selectedSize;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSize(s.size)}
                        className={[
                          "min-w-[3.25rem] h-11 rounded-xl px-3 text-sm font-semibold border transition-all",
                          active
                            ? "border-[#CF0A0A] bg-[#CF0A0A] text-white shadow-[0_8px_20px_-10px_rgba(207,10,10,0.6)]"
                            : "border-black/10 bg-white text-black hover:border-black/40",
                        ].join(" ")}
                      >
                        {s.size}
                      </button>
                    );
                  })}
                </div>


                {selectedSize && selectedSizeClasses.length > 0 && (
                  <p className="mt-3 text-[13px] leading-relaxed text-black/70">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-black">
                      <GraduationCap className="h-3.5 w-3.5 text-[#CF0A0A]" />
                      Size {selectedSize}
                    </span>{" "}
                    is recommended for students in:{" "}
                    <span className="font-semibold text-[#CF0A0A]">
                      {selectedSizeClasses.map((c) => c.label).join(" • ")}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Gender */}
            {product.genders.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-2 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Gender
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.genders.map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center rounded-full bg-black/[0.04] text-black text-xs font-medium px-3 py-1.5"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}


            {/* Quantity + Add To Cart */}
            <div className="pt-4 border-t border-black/5 space-y-4">
              {!oos && (
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-black/50">
                    Quantity
                  </span>
                  <div className="inline-flex items-center rounded-2xl border border-black/10 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="h-11 w-11 grid place-items-center hover:bg-black/[0.04]"
                      aria-label="Decrease"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="h-11 w-12 grid place-items-center text-sm font-semibold border-x border-black/10">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(99, q + 1))}
                      className="h-11 w-11 grid place-items-center hover:bg-black/[0.04]"
                      aria-label="Increase"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2.5">
                <button
                  type="button"
                  disabled={oos || addToCartMut.isPending}
                  onClick={handleAddToCart}
                  className={[
                    "h-12 sm:h-13 px-3 rounded-2xl font-semibold text-[12px] sm:text-[13px] tracking-wide leading-none whitespace-nowrap inline-flex items-center justify-center gap-2 transition-all",
                    oos
                      ? "bg-black/10 text-black/40 cursor-not-allowed"
                      : "bg-black text-white hover:bg-black/85 hover:-translate-y-0.5",
                  ].join(" ")}
                >
                  {addToCartMut.isPending ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <ShoppingBag className="h-4 w-4 shrink-0" />
                  )}
                  {oos ? "Out of Stock" : "Add to Cart"}
                </button>
                <button
                  type="button"
                  disabled={oos}
                  onClick={handleBuyNow}
                  className={[
                    "h-12 sm:h-13 px-3 rounded-2xl font-semibold text-[12px] sm:text-[13px] tracking-wide leading-none whitespace-nowrap inline-flex items-center justify-center gap-2 transition-all",
                    oos
                      ? "bg-black/10 text-black/40 cursor-not-allowed"
                      : "bg-[#CF0A0A] text-white hover:bg-[#a80808] shadow-[0_12px_30px_-10px_rgba(207,10,10,0.5)] hover:-translate-y-0.5",
                  ].join(" ")}
                >
                  <Zap className="h-4 w-4 shrink-0" />
                  Buy Now
                </button>

                <button
                  type="button"
                  onClick={handleWishlist}
                  disabled={toggleWish.isPending}
                  aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                  className="h-12 sm:h-13 w-full sm:w-13 rounded-2xl border border-black/10 grid place-items-center hover:border-[#CF0A0A] hover:bg-[#CF0A0A]/5 transition-colors"
                >
                  {toggleWish.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin text-black/50" />
                  ) : (
                    <Heart
                      className={`h-5 w-5 transition-colors ${
                        inWishlist ? "fill-[#CF0A0A] text-[#CF0A0A]" : "text-black/60"
                      }`}
                    />
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Tabs: Description · Specifications · Reviews */}
        <section className="pd-rise mt-16 lg:mt-20" style={{ animationDelay: "0.5s" }}>
          <Tabs defaultValue="description">
            <TabsList className="h-auto bg-transparent p-0 gap-6 border-b border-black/10 w-full justify-start rounded-none">
              {[
                { v: "description", l: "Description" },
                { v: "specs", l: "Specifications" },
                { v: "reviews", l: "Reviews" },
              ].map((t) => (
                <TabsTrigger
                  key={t.v}
                  value={t.v}
                  className="rounded-none bg-transparent px-0 pb-3 text-sm font-semibold text-black/50 data-[state=active]:text-black data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#CF0A0A]"
                >
                  {t.l}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="description" className="pt-8">
              {product.description && product.description.trim() ? (
                <div
                  className="prose prose-neutral max-w-4xl prose-headings:font-bold prose-a:text-[#CF0A0A] prose-strong:text-black prose-table:border prose-th:bg-[#F7F7F7] prose-th:p-2 prose-td:p-2 prose-td:border"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              ) : (
                <p className="text-sm text-black/50">No description provided for this product.</p>
              )}
            </TabsContent>

            <TabsContent value="specs" className="pt-8">
              <SpecificationsPanel product={product} />
            </TabsContent>

            <TabsContent value="reviews" className="pt-8">
              <ProductReviewsSection module={product.module} productId={product.id} />
            </TabsContent>
          </Tabs>
        </section>

        {/* Related */}
        {product.related.length > 0 && (
          <section className="mt-16 lg:mt-24">
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight">You may also like</h2>
              <span className="text-xs uppercase tracking-widest text-black/40">
                From the same range
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {product.related.map((p) => (
                <RelatedCard key={p.id} p={p} hrefBase={hrefBaseForRelated} />
              ))}
            </div>
          </section>
        )}

      </div>

      {/* Mobile sticky footer */}
      <div className="lg:hidden sticky bottom-0 z-30 bg-white border-t border-black/10 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.15)]">
        <div>
          {displayPrice != null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-black">
                Rs {displayPrice.toLocaleString()}
              </span>
              {strikePrice && (
                <span className="text-xs text-black/40 line-through">
                  Rs {strikePrice.toLocaleString()}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-black/60">Price on request</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleWishlist}
            aria-label="Wishlist"
            className="h-12 w-12 rounded-xl border border-black/10 grid place-items-center"
          >
            <Heart className={`h-5 w-5 ${inWishlist ? "fill-[#CF0A0A] text-[#CF0A0A]" : "text-black/60"}`} />
          </button>
          <button
            type="button"
            disabled={oos}
            onClick={handleAddToCart}
            className={[
              "h-12 px-5 rounded-xl font-semibold text-sm inline-flex items-center gap-2",
              oos ? "bg-black/10 text-black/40" : "bg-black text-white",
            ].join(" ")}
          >
            <ShoppingBag className="h-4 w-4" />
            {oos ? "Out of Stock" : "Add"}
          </button>
          <button
            type="button"
            disabled={oos}
            onClick={handleBuyNow}
            className={[
              "h-12 px-5 rounded-xl font-semibold text-sm inline-flex items-center gap-2",
              oos ? "bg-black/10 text-black/40" : "bg-[#CF0A0A] text-white",
            ].join(" ")}
          >
            <Zap className="h-4 w-4" /> Buy
          </button>
        </div>

      </div>

      <SizeGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        guides={product.sizingGuides}
        selectedSize={selectedSize}
      />
    </div>
  );
}

function ProductReviewsSection({ module, productId }: { module: string; productId: string }) {
  const fn = useServerFn(getProductReviews);
  const q = useQuery({
    queryKey: ["product-reviews", module, productId],
    queryFn: () => fn({ data: { module: module as any, product_id: productId } }),
  });
  const data = q.data;
  if (q.isLoading) return null;
  if (!data || data.total === 0) return null;

  return (
    <section className="mt-16 lg:mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Customer Reviews</h2>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < Math.round(data.average) ? "fill-amber-400 text-amber-400" : "text-black/15"
                }`}
              />
            ))}
          </div>
          <span className="font-bold text-black">{data.average.toFixed(1)}</span>
          <span className="text-black/50">
            · {data.total} review{data.total === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {data.reviews.map((r: PublicReview) => (
          <article key={r.id} className="rounded-2xl bg-white border border-black/5 p-6">
            <div className="flex items-center gap-3">
              {r.customer_photo ? (
                <img src={r.customer_photo} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-[#CF0A0A]/10 grid place-items-center text-sm font-bold text-[#CF0A0A]">
                  {r.customer_name.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-black truncate">{r.customer_name}</p>
                <p className="text-[11px] text-black/50">
                  {new Date(r.created_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < r.rating ? "fill-amber-400 text-amber-400" : "text-black/15"
                    }`}
                  />
                ))}
              </div>
            </div>
            {r.review_title && (
              <p className="mt-4 font-bold text-black">{r.review_title}</p>
            )}
            <p className="mt-2 text-sm text-black/70 whitespace-pre-wrap leading-relaxed">
              {r.review_text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SpecificationsPanel({ product }: { product: ProductDetails }) {
  const rows: { label: string; value: React.ReactNode }[] = [];
  if (product.category?.name) rows.push({ label: "Category", value: product.category.name });
  if (product.sizes.length)
    rows.push({ label: "Available Sizes", value: product.sizes.map((s) => s.size).join(", ") });
  if (product.colours.length)
    rows.push({
      label: "Colours",
      value: (
        <div className="flex flex-wrap items-center gap-2">
          {product.colours.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 text-xs">
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: c.hex_code }}
              />
              {c.colour_name}
            </span>
          ))}
        </div>
      ),
    });
  if (product.genders.length) rows.push({ label: "Gender", value: product.genders.join(", ") });
  const classLabelById = new Map(product.classes.map((c) => [c.id, c.label]));
  const sizeClassRows = product.sizes
    .map((s) => ({
      size: s.size,
      labels: (s.classIds ?? [])
        .map((id) => classLabelById.get(id))
        .filter((l): l is string => !!l),
    }))
    .filter((r) => r.labels.length > 0);
  if (sizeClassRows.length)
    rows.push({
      label: "Assigned Sizes & Classes",
      value: (
        <div className="flex flex-col gap-1">
          {sizeClassRows.map((r) => (
            <span key={r.size} className="text-sm">
              <span className="font-semibold">{r.size}</span>
              <span className="text-black/40"> → </span>
              {r.labels.join(", ")}
            </span>
          ))}
        </div>
      ),
    });
  if ((product.product_types ?? []).length)
    rows.push({
      label: "Type",
      value: (
        <div className="flex flex-wrap gap-1.5">
          {(product.product_types ?? []).map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full bg-black/[0.05] text-black text-xs font-medium px-2.5 py-1"
            >
              {t}
            </span>
          ))}
        </div>
      ),
    });
  if (product.quality_tags.length)
    rows.push({ label: "Quality", value: product.quality_tags.join(", ") });


  if (rows.length === 0) {
    return <p className="text-sm text-black/50">No specifications provided.</p>;
  }

  return (
    <div className="max-w-3xl overflow-hidden rounded-2xl border border-black/10 bg-white">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.label} className={i > 0 ? "border-t border-black/5" : ""}>
              <th className="w-1/3 text-left px-5 py-3.5 font-semibold text-black/60 bg-[#F7F7F7] align-top">
                {r.label}
              </th>
              <td className="px-5 py-3.5 text-black">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
