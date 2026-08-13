import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, ShoppingBag, X, Info, Landmark, Tag, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useCart, useProfile } from "@/hooks/use-shop";
import { placeOrder, uploadPaymentScreenshot, type CartLineInput } from "@/lib/shop.functions";
import { getActiveDeliveryCharge, type DeliveryChargeRow } from "@/lib/delivery-charges.functions";
import { listActiveBankAccounts, type BankAccountRow } from "@/lib/bank-accounts.functions";
import { validateCoupon, type ValidateCouponResult } from "@/lib/coupons.functions";
import { readBuyNowLine, clearBuyNowLine } from "@/lib/pending-action";
import { AccountModal } from "@/components/site/AccountModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const searchSchema = z.object({ mode: z.enum(["cart", "buynow"]).optional().default("cart") });

export const Route = createFileRoute("/checkout")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Checkout | Alkausar Uniforms" },
      { name: "description", content: "Complete your order — cash on delivery available." },
      { property: "og:title", content: "Checkout | Alkausar Uniforms" },
      { property: "og:description", content: "Complete your order — cash on delivery available." },
    ],
  }),
  component: CheckoutPage,
});

type SuccessInfo = { orderNumber: string; orderId: string };

function CheckoutPage() {
  const { mode } = Route.useSearch();
  const { user, ready } = useAuthUser();
  const cartQ = useCart();
  const profileQ = useProfile();
  const navigate = useNavigate();
  const placeOrderFn = useServerFn(placeOrder);
  const getDeliveryFn = useServerFn(getActiveDeliveryCharge);
  const listBanksFn = useServerFn(listActiveBankAccounts);
  const validateCouponFn = useServerFn(validateCoupon);
  const uploadScreenshotFn = useServerFn(uploadPaymentScreenshot);
  const [authOpen, setAuthOpen] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResult["coupon"] | null>(null);

  const [buyNowLine, setBuyNowLineState] = useState<CartLineInput | null>(null);
  useEffect(() => {
    if (mode === "buynow") setBuyNowLineState(readBuyNowLine());
  }, [mode]);

  useEffect(() => {
    if (ready && !user) setAuthOpen(true);
  }, [ready, user]);

  const deliveryQ = useQuery<DeliveryChargeRow | null>({
    queryKey: ["active-delivery-charge"],
    queryFn: () => getDeliveryFn(),
    enabled: !!user,
  });
  const banksQ = useQuery<BankAccountRow[]>({
    queryKey: ["active-bank-accounts"],
    queryFn: () => listBanksFn(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const deliveryCharge = deliveryQ.data?.delivery_charge ?? 0;
  const deliveryInstruction = deliveryQ.data?.instruction ?? null;

  const items = useMemo(() => {
    if (mode === "buynow" && buyNowLine) {
      return [
        {
          id: "buynow",
          module: buyNowLine.module,
          product_id: buyNowLine.productId,
          category_id: buyNowLine.categoryId ?? null,
          product_name: buyNowLine.productName,
          product_image: buyNowLine.productImagePath ?? null,
          color: buyNowLine.color ?? null,
          size: buyNowLine.size ?? null,
          gender: buyNowLine.gender ?? null,
          class_name: buyNowLine.className ?? null,
          product_type: buyNowLine.productType ?? null,
          quantity: buyNowLine.quantity,
          unit_price: buyNowLine.unitPrice,
        },
      ];
    }
    return (cartQ.data ?? []).map((c) => ({
      id: c.id,
      module: c.module,
      product_id: c.product_id,
      category_id: c.category_id,
      product_name: c.product_name,
      product_image: c.product_image,
      color: c.color,
      size: c.size,
      gender: c.gender,
      class_name: c.class_name,
      product_type: c.product_type ?? null,
      quantity: c.quantity,
      unit_price: c.unit_price,
    }));
  }, [mode, buyNowLine, cartQ.data]);

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const modulesInCart = useMemo(
    () => Array.from(new Set(items.map((i) => i.module))) as any[],
    [items],
  );

  // Auto-clear coupon if it no longer meets minimum
  const couponDiscount = appliedCoupon ? Math.min(appliedCoupon.discount_amount, subtotal) : 0;
  const grandTotal = Math.max(0, subtotal - couponDiscount) + deliveryCharge;

  const applyCoupon = useMutation({
    mutationFn: async () => {
      const res = await validateCouponFn({
        data: { code: couponInput, subtotal, modules: modulesInCart },
      });
      if (!res.ok || !res.coupon) throw new Error(res.error ?? "Invalid coupon");
      return res.coupon;
    },
    onSuccess: (c) => {
      setAppliedCoupon(c);
      toast.success("Coupon Applied Successfully");
    },
    onError: (e: any) => toast.error(e?.message ?? "Invalid Coupon Code"),
  });

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
  };

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "Pakistan",
    city: "",
    postalCode: "",
    address: "",
    deliveryNote: "",
  });

  useEffect(() => {
    if (profileQ.data) {
      setForm((f) => ({
        ...f,
        fullName: f.fullName || profileQ.data!.full_name || "",
        email: profileQ.data!.email || "",
        phone: f.phone || profileQ.data!.phone || "",
      }));
    }
  }, [profileQ.data]);

  const place = useMutation({
    mutationFn: async () => {
      if (paymentMethod === "online" && !screenshotFile) {
        throw new Error("Please upload your payment screenshot before placing the order.");
      }

      let screenshotPath: string | null = null;
      if (paymentMethod === "online" && screenshotFile) {
        setUploadingScreenshot(true);
        try {
          const dataBase64 = await fileToBase64(screenshotFile);
          const res = await uploadScreenshotFn({
            data: {
              fileName: screenshotFile.name,
              contentType: screenshotFile.type || "application/octet-stream",
              dataBase64,
            },
          });
          screenshotPath = res.path;
        } finally {
          setUploadingScreenshot(false);
        }
      }

      const payload = {
        shipping: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          country: form.country.trim(),
          city: form.city.trim(),
          postalCode: form.postalCode.trim() || null,
          address: form.address.trim(),
          deliveryNote: form.deliveryNote.trim() || null,
        },
        items: items.map((i) => ({
          module: i.module,
          productId: i.product_id,
          categoryId: i.category_id,
          productName: i.product_name,
          productImagePath: i.product_image,
          color: i.color,
          size: i.size,
          gender: i.gender,
          className: i.class_name,
          productType: (i as any).product_type ?? null,
          quantity: i.quantity,
          unitPrice: i.unit_price,
        })),
        paymentMethod,
        paymentScreenshot: screenshotPath,
        source: mode as "cart" | "buynow",
        couponCode: appliedCoupon?.code ?? null,
      };
      return placeOrderFn({ data: payload as any });
    },
    onSuccess: (res) => {
      clearBuyNowLine();
      setSuccess({ orderNumber: res.orderNumber, orderId: res.orderId });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to place order"),
  });

  const canSubmit =
    !!form.fullName && !!form.email && !!form.phone && !!form.country && !!form.city && !!form.address &&
    items.length > 0 && (paymentMethod === "cod" || !!screenshotFile);

  const handleScreenshotChange = (file: File | null) => {
    if (!file) {
      setScreenshotFile(null);
      setScreenshotPreview(null);
      return;
    }
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!["jpg", "jpeg", "png", "webp", "pdf"].includes(ext)) {
      toast.error("Unsupported file type. Use JPG, PNG, WEBP, or PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be 5 MB or smaller.");
      return;
    }
    setScreenshotFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setScreenshotPreview(url);
    } else {
      setScreenshotPreview(null);
    }
  };

  if (ready && user && !cartQ.isLoading && items.length === 0 && !success) {
    return (
      <SiteLayout>
        <div className="max-w-md mx-auto text-center py-32 px-6">
          <div className="mx-auto h-20 w-20 rounded-full bg-[#CF0A0A]/10 grid place-items-center">
            <ShoppingBag className="h-8 w-8 text-[#CF0A0A]" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-black">Nothing to check out</h2>
          <p className="mt-2 text-sm text-black/60">Add products to your cart first.</p>
          <button onClick={() => navigate({ to: "/accessories" })} className="mt-6 rounded-full bg-[#CF0A0A] px-6 py-3 text-sm font-semibold text-white">
            Browse Products
          </button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16">
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#CF0A0A] font-bold">Checkout</p>
          <h1 className="text-3xl md:text-4xl font-bold text-black mt-2">Complete Your Order</h1>
        </div>

        {!user ? (
          <div className="py-16 text-center">
            <p className="text-black/60">Please sign in to continue.</p>
            <button onClick={() => setAuthOpen(true)} className="mt-4 rounded-full bg-[#CF0A0A] px-6 py-3 text-sm font-semibold text-white">
              Sign in
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-8 items-start min-w-0">
            <div className="space-y-6 min-w-0">
              <Section title="Personal Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Full Name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
                  <Field label="Email" value={form.email} readOnly />
                  <Field label="Phone / WhatsApp" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} className="md:col-span-2" />
                </div>
              </Section>

              <Section title="Shipping Address">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
                  <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                  <Field label="Postal Code (optional)" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} />
                  <div className="md:col-span-2">
                    <Label>Complete Address</Label>
                    <textarea
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      rows={3}
                      className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#CF0A0A] outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Delivery Note (optional)</Label>
                    <textarea
                      value={form.deliveryNote}
                      onChange={(e) => setForm({ ...form, deliveryNote: e.target.value })}
                      rows={2}
                      className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#CF0A0A] outline-none"
                    />
                  </div>
                </div>
              </Section>

              <Section title="Payment Method">
                <label
                  className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                    paymentMethod === "cod"
                      ? "border-[#CF0A0A] bg-[#CF0A0A]/5"
                      : "border-black/10 hover:border-black/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="mt-1 accent-[#CF0A0A]"
                  />
                  <div>
                    <p className="font-semibold text-black">Cash on Delivery</p>
                    <p className="text-xs text-black/60 mt-0.5">Pay when your order arrives.</p>
                  </div>
                </label>
                <label
                  className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                    paymentMethod === "online"
                      ? "border-[#CF0A0A] bg-[#CF0A0A]/5"
                      : "border-black/10 hover:border-black/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "online"}
                    onChange={() => setPaymentMethod("online")}
                    className="mt-1 accent-[#CF0A0A]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-black">Online Payment (Bank Transfer)</p>
                    </div>
                    <p className="text-xs text-black/60 mt-0.5">
                      Transfer to any of the bank accounts below and share the receipt with us.
                    </p>
                  </div>
                </label>

                {paymentMethod === "online" && (
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-black/50">
                      <Landmark className="h-3.5 w-3.5 text-[#CF0A0A]" />
                      Bank Details
                    </div>
                    {banksQ.isLoading ? (
                      <div className="text-sm text-black/50 py-4">Loading bank accounts…</div>
                    ) : (banksQ.data ?? []).length === 0 ? (
                      <div className="rounded-2xl bg-[#F7F5F0] border border-black/5 p-4 text-sm text-black/60">
                        No bank accounts are available right now. Please choose Cash on Delivery or contact us.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(banksQ.data ?? []).map((b) => (
                          <div
                            key={b.id}
                            className="rounded-2xl border border-black/10 bg-white p-4"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#CF0A0A]/8 text-[#CF0A0A]">
                                <Landmark className="h-4 w-4" />
                              </div>
                              <h4 className="font-semibold text-black">{b.bank_name}</h4>
                            </div>
                            <div className="space-y-2 text-sm">
                              <BankLine label="Account Title" value={b.account_title} />
                              <BankLine label="Account Number" value={b.account_number} mono />
                              {b.iban_number && (
                                <BankLine label="IBAN" value={b.iban_number} mono />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-black/50 mb-2">
                        <Upload className="h-3.5 w-3.5 text-[#CF0A0A]" />
                        Upload Payment Screenshot <span className="text-[#CF0A0A]">*</span>
                      </div>
                      {screenshotFile ? (
                        <div className="rounded-2xl border border-black/10 bg-white p-3 flex flex-wrap sm:flex-nowrap items-center gap-3 max-w-full overflow-hidden">
                          {screenshotPreview ? (
                            <img
                              src={screenshotPreview}
                              alt="Payment proof preview"
                              className="w-16 h-16 object-contain p-1 bg-[#F7F7F7] rounded-lg border border-black/10 shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-[#F7F5F0] grid place-items-center shrink-0">
                              <FileText className="h-6 w-6 text-black/40" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 basis-0">
                            <p className="text-[13px] sm:text-sm font-semibold text-black truncate">
                              {screenshotFile.name}
                            </p>
                            <p className="text-[11px] text-black/50">
                              {(screenshotFile.size / 1024).toFixed(0)} KB
                            </p>
                            <div className="flex gap-2 mt-1">
                              <label className="text-[11px] font-semibold text-[#CF0A0A] hover:underline cursor-pointer">
                                Replace
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                                  className="hidden"
                                  onChange={(e) => handleScreenshotChange(e.target.files?.[0] ?? null)}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => handleScreenshotChange(null)}
                                className="text-[11px] font-semibold text-black/50 hover:text-black"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <label className="flex max-w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/15 hover:border-[#CF0A0A] bg-white/60 px-3 py-5 sm:py-6 cursor-pointer text-[13px] sm:text-sm text-black/60 text-center">
                          <Upload className="h-4 w-4" />
                          <span>
                            Click to upload screenshot
                            <span className="block text-[11px] text-black/40">
                              JPG, PNG, WEBP, or PDF · up to 5 MB
                            </span>
                          </span>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                            className="hidden"
                            onChange={(e) => handleScreenshotChange(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </Section>
            </div>

            <div className="lg:sticky lg:top-24 bg-white border border-black/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-black">Order Summary</h3>
              <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                {items.map((i) => (
                  <div key={i.id} className="flex gap-3">
                    <div className="w-14 h-16 rounded-lg bg-[#F7F5F0] overflow-hidden grid place-items-center shrink-0">
                      {i.product_image ? (
                        <img src={i.product_image} alt="" className="w-full h-full object-contain p-1" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-semibold text-black line-clamp-2">{i.product_name}</p>
                      <p className="text-black/50 mt-0.5 capitalize">{i.module}</p>
                      <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-black/60">
                        {i.color && <span>{i.color}</span>}
                        {i.size && <span>· {i.size}</span>}
                        {i.gender && <span>· {i.gender}</span>}
                        {i.class_name && <span>· {i.class_name}</span>}
                        {(i as any).product_type && <span>· {(i as any).product_type}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-black/60">Qty {i.quantity}</span>
                        <span className="font-semibold text-black">Rs {(i.unit_price * i.quantity).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Coupon */}
              <div className="border-t border-black/10 pt-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="h-4 w-4 text-green-700 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-green-800 truncate">
                          {appliedCoupon.code} applied
                        </p>
                        <p className="text-[10px] text-green-700/80">
                          {appliedCoupon.discount_type === "percentage"
                            ? `${appliedCoupon.discount_value}% off`
                            : `Rs ${appliedCoupon.discount_value} off`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-green-800 hover:text-green-900 shrink-0"
                      title="Remove coupon"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/40" />
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Coupon code"
                        className="w-full h-10 pl-9 pr-3 rounded-xl border border-black/10 text-sm font-mono outline-none focus:border-[#CF0A0A]"
                      />
                    </div>
                    <button
                      onClick={() => applyCoupon.mutate()}
                      disabled={!couponInput.trim() || applyCoupon.isPending}
                      className="h-10 px-4 rounded-xl bg-black text-white text-xs font-semibold hover:bg-black/80 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {applyCoupon.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                      Apply
                    </button>
                  </div>
                )}
              </div>
              <div className="border-t border-black/10 pt-4 space-y-2 text-sm">
                <Row label="Subtotal" value={`Rs ${subtotal.toLocaleString()}`} />
                {appliedCoupon && (
                  <Row
                    label={`Coupon (${appliedCoupon.code})`}
                    value={`- Rs ${couponDiscount.toLocaleString()}`}
                  />
                )}
                <Row
                  label="Delivery Charges"
                  value={
                    deliveryQ.isLoading
                      ? "…"
                      : deliveryCharge > 0
                        ? `Rs ${deliveryCharge.toLocaleString()}`
                        : "Free"
                  }
                />
              </div>
              <div className="border-t border-black/10 pt-4 flex items-center justify-between">
                <span className="font-bold text-black">Total</span>
                <span className="text-xl font-bold text-[#CF0A0A]">Rs {grandTotal.toLocaleString()}</span>
              </div>
              {deliveryInstruction && (
                <div className="rounded-2xl bg-[#F7F5F0] border border-black/5 p-3 flex gap-2">
                  <Info className="h-4 w-4 text-[#CF0A0A] shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-black/70 whitespace-pre-line">
                    {deliveryInstruction}
                  </p>
                </div>
              )}
              <button
                onClick={() => place.mutate()}
                disabled={!canSubmit || place.isPending}
                className="w-full h-12 rounded-2xl bg-[#CF0A0A] text-white text-sm font-semibold hover:bg-[#a80808] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {place.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                Place Order
              </button>
              <p className="text-[10px] text-black/40 text-center">By placing this order you agree to our terms.</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!success} onOpenChange={(o) => !o && navigate({ to: "/orders" })}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 grid place-items-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-center text-2xl mt-4">Thank You for Your Purchase!</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-sm text-black/60">
              Your order has been placed successfully.<br />
              It will be delivered within the next business days.
            </p>
            {success && (
              <div className="rounded-2xl bg-black/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">Order Number</p>
                <p className="text-lg font-bold text-black mt-1">{success.orderNumber}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => navigate({ to: "/orders" })}
                className="flex-1 h-11 rounded-xl bg-[#CF0A0A] text-white text-sm font-semibold hover:bg-[#a80808]"
              >
                View My Orders
              </button>
              <button
                onClick={() => navigate({ to: "/accessories" })}
                className="flex-1 h-11 rounded-xl border border-black/10 text-black text-sm font-semibold hover:bg-black/5"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AccountModal open={authOpen} onOpenChange={setAuthOpen} />
    </SiteLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-black/5 rounded-3xl p-6">
      <h3 className="text-lg font-bold text-black mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60 mb-1.5">{children}</label>;
}
function Field({
  label,
  value,
  onChange,
  readOnly,
  className,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full h-11 rounded-xl border border-black/10 px-3 text-sm outline-none ${
          readOnly ? "bg-black/[0.03] text-black/60" : "focus:border-[#CF0A0A]"
        }`}
      />
    </div>
  );
}
function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? "text-black/40" : ""}`}>
      <span>{label}</span>
      <span className={muted ? "" : "font-semibold text-black"}>{value}</span>
    </div>
  );
}

function BankLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] uppercase tracking-wider font-semibold text-black/50 mt-0.5">
        {label}
      </span>
      <span className={`min-w-0 break-all text-[13px] sm:text-sm text-black text-right ${mono ? "font-mono" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf("base64,");
      resolve(idx >= 0 ? result.slice(idx + 7) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
