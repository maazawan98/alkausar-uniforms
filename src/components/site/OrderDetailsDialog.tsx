import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Package, User, MapPin, CreditCard, Ticket, Receipt, ShieldAlert, Upload, Loader2,
  CheckCircle2, Circle, XCircle, Download, Printer,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { uploadPaymentScreenshot, resubmitPaymentScreenshot, type Order } from "@/lib/shop.functions";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: Order | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const TIMELINE = ["Order Placed", "Payment Received", "Confirmed", "Shipped", "Delivered"];
const STATUS_TO_STEP: Record<string, number> = {
  pending: 0, processing: 2, confirmed: 2, shipped: 3, delivered: 4,
};

export function OrderDetailsDialog({ open, onOpenChange, order }: Props) {
  if (!order) return null;
  const o = order;
  const statusClass = STATUS_STYLES[o.status] ?? "bg-black/10 text-black/70 border-black/10";
  const currentStep = STATUS_TO_STEP[o.status] ?? 0;
  const isCancelled = o.status === "cancelled";
  const paymentReceived = o.payment_method === "cod" || o.payment_status === "verified";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-3rem)] max-h-[90dvh] overflow-hidden p-0 gap-0 rounded-2xl flex flex-col">
        <DialogTitle className="sr-only">Order {o.order_number}</DialogTitle>

        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 sm:py-5 border-b border-black/5 bg-gradient-to-r from-[#CF0A0A]/5 to-transparent flex items-start justify-between gap-3 pr-12">
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#CF0A0A] font-bold">Order</p>
            <h2 className="text-base sm:text-xl md:text-2xl font-bold text-black mt-0.5 truncate">{o.order_number}</h2>
            <p className="text-[11px] sm:text-xs text-black/50 mt-1">
              {new Date(o.created_at).toLocaleString(undefined, {
                day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${statusClass}`}>
              {o.status}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">

          {/* Rejected banner */}
          {o.payment_method === "online" && o.payment_status === "rejected" && (
            <PaymentRejectedCard orderId={o.id} />
          )}

          {/* Timeline */}
          <Section icon={Package} title="Order Timeline">
            {isCancelled ? (
              <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <p className="font-semibold text-red-800">Cancelled by Admin</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <Timeline currentStep={currentStep} paymentReceived={paymentReceived} />
            )}
          </Section>

          {/* Two-column grid */}
          <div className="grid md:grid-cols-2 gap-5 sm:gap-6 min-w-0">
            <Section icon={User} title="Customer Information">
              <InfoRow label="Full Name" value={o.full_name} />
              <InfoRow label="Email" value={o.email} />
              <InfoRow label="Phone / WhatsApp" value={o.phone ?? "—"} />
            </Section>

            <Section icon={MapPin} title="Shipping Information">
              <InfoRow label="Country" value={o.country} />
              <InfoRow label="City" value={o.city} />
              <InfoRow label="Postal Code" value={o.postal_code || "—"} />
              <InfoRow label="Address" value={o.address} />
              {o.delivery_note && <InfoRow label="Notes" value={o.delivery_note} />}
            </Section>
          </div>

          {/* Products */}
          <Section icon={Package} title={`Products (${o.items.length})`}>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-black/5">
              <table className="w-full text-sm">
                <thead className="bg-black/[0.03] text-[10px] uppercase tracking-widest text-black/50">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2.5">Product</th>
                    <th className="text-left font-semibold px-3 py-2.5">Module</th>
                    <th className="text-left font-semibold px-3 py-2.5">Variant</th>
                    <th className="text-right font-semibold px-3 py-2.5">Qty</th>
                    <th className="text-right font-semibold px-3 py-2.5">Unit</th>
                    <th className="text-right font-semibold px-3 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {o.items.map((it, i) => (
                    <tr key={i} className="border-t border-black/5">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-[#F7F5F0] overflow-hidden grid place-items-center shrink-0">
                            {it.product_image && <img src={it.product_image} alt="" className="h-full w-full object-contain p-1" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-black truncate">{it.product_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs capitalize text-black/70">{it.module}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1 text-[11px] text-black/60">
                          {it.color && <span className="rounded-full bg-black/5 px-2 py-0.5">{it.color}</span>}
                          {it.size && <span className="rounded-full bg-black/5 px-2 py-0.5">{it.size}</span>}
                          {it.gender && <span className="rounded-full bg-black/5 px-2 py-0.5">{it.gender}</span>}
                          {it.class_name && <span className="rounded-full bg-black/5 px-2 py-0.5">{it.class_name}</span>}
                          {it.product_type && <span className="rounded-full bg-[#CF0A0A]/10 text-[#CF0A0A] font-semibold px-2 py-0.5">{it.product_type}</span>}

                          {!it.color && !it.size && !it.gender && !it.class_name && !it.product_type && <span className="text-black/40">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">{it.quantity}</td>
                      <td className="px-3 py-3 text-right">Rs {Number(it.unit_price).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right font-semibold">Rs {Number(it.total_price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {o.items.map((it, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-black/5 p-3">
                  <div className="h-16 w-16 rounded-lg bg-[#F7F5F0] overflow-hidden grid place-items-center shrink-0">
                    {it.product_image && <img src={it.product_image} alt="" className="h-full w-full object-contain p-1" />}
                  </div>
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="text-[10px] uppercase tracking-widest text-black/40 capitalize">{it.module}</p>
                    <p className="font-semibold text-black truncate">{it.product_name}</p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-black/60">
                      {it.color && <span className="rounded-full bg-black/5 px-2 py-0.5">{it.color}</span>}
                      {it.size && <span className="rounded-full bg-black/5 px-2 py-0.5">{it.size}</span>}
                      {it.gender && <span className="rounded-full bg-black/5 px-2 py-0.5">{it.gender}</span>}
                      {it.class_name && <span className="rounded-full bg-black/5 px-2 py-0.5">{it.class_name}</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-black/60">Qty {it.quantity} · Rs {Number(it.unit_price).toLocaleString()}</span>
                      <span className="font-bold text-black">Rs {Number(it.total_price).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Payment + Coupon */}
          <div className="grid md:grid-cols-2 gap-5 sm:gap-6 min-w-0">
            <Section icon={CreditCard} title="Payment Information">
              <InfoRow label="Method" value={o.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"} />
              {o.payment_method === "online" && (
                <>
                  <InfoRow
                    label="Status"
                    value={
                      <span className={`font-semibold uppercase tracking-wider text-[11px] ${
                        o.payment_status === "verified" ? "text-green-700"
                          : o.payment_status === "rejected" ? "text-red-600"
                          : "text-amber-600"
                      }`}>
                        {o.payment_status === "verified" ? "Verified"
                          : o.payment_status === "rejected" ? "Rejected"
                          : "Pending Verification"}
                      </span>
                    }
                  />
                  {o.payment_screenshot && (
                    <div className="mt-3">
                      <p className="text-[10px] uppercase tracking-widest text-black/40 mb-2">Payment Screenshot</p>
                      <a
                        href={o.payment_screenshot}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl overflow-hidden border border-black/10 hover:border-[#CF0A0A] bg-[#F7F5F0]"
                      >
                        {/\.pdf(\?|$)/i.test(o.payment_screenshot) ? (
                          <div className="p-4 text-center text-sm text-black/60">Open PDF ↗</div>
                        ) : (
                          <img src={o.payment_screenshot} alt="Payment proof" className="w-full max-h-64 object-contain bg-white" />
                        )}
                      </a>
                    </div>
                  )}
                </>
              )}
            </Section>

            <Section icon={Ticket} title="Coupon Information">
              {o.coupon_code ? (
                <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm">
                  <p className="font-bold text-green-800">{o.coupon_code}</p>
                  <p className="text-green-700 mt-1 text-xs">
                    {o.coupon_discount_type === "percentage"
                      ? `${Number(o.coupon_discount_value ?? 0)}% off — Rs ${Number(o.coupon_discount).toLocaleString()}`
                      : `Rs ${Number(o.coupon_discount).toLocaleString()} discount`}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-black/50 italic">No Coupon Applied</p>
              )}
            </Section>
          </div>

          {/* Summary */}
          <Section icon={Receipt} title="Order Summary">
            <div className="rounded-xl border border-black/5 divide-y divide-black/5">
              <SummaryRow label="Subtotal" value={`Rs ${Number(o.subtotal).toLocaleString()}`} />
              <SummaryRow label="Delivery Charges" value={`Rs ${Number(o.delivery_charge ?? 0).toLocaleString()}`} />
              {o.coupon_discount > 0 && (
                <SummaryRow label="Coupon Discount" value={`- Rs ${Number(o.coupon_discount).toLocaleString()}`} valueClass="text-green-700" />
              )}
              <div className="flex items-center justify-between px-4 py-3 bg-black/[0.02]">
                <span className="font-bold text-black">Grand Total</span>
                <span className="text-xl font-bold text-[#CF0A0A]">Rs {Number(o.total).toLocaleString()}</span>
              </div>
            </div>
          </Section>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-black/5 bg-white flex flex-wrap items-center justify-end gap-2">
          <button
            disabled
            title="Coming Soon"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-xs font-semibold text-black/40 cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" /> Download Invoice
          </button>
          <button
            disabled
            title="Coming Soon"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-xs font-semibold text-black/40 cursor-not-allowed"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-2 rounded-full bg-black text-white px-5 py-2 text-xs font-semibold hover:bg-black/85"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <div className="grid place-items-center h-7 w-7 rounded-lg bg-[#CF0A0A]/10 text-[#CF0A0A]">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-[12px] sm:text-sm font-bold text-black uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px] sm:text-sm py-1 sm:py-1.5">
      <span className="text-black/50 shrink-0">{label}</span>
      <span className="text-black font-medium text-right break-words">{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 text-[13px] sm:text-sm">
      <span className="text-black/60">{label}</span>
      <span className={`font-semibold text-black ${valueClass}`}>{value}</span>
    </div>
  );
}

function Timeline({ currentStep, paymentReceived }: { currentStep: number; paymentReceived: boolean }) {
  return (
    <ol className="relative flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-0">
      {TIMELINE.map((label, idx) => {
        const isPaymentStep = idx === 1;
        const done = idx <= currentStep && (!isPaymentStep || paymentReceived);
        const active = idx === currentStep;
        return (
          <li key={label} className="flex sm:flex-col items-center sm:flex-1 gap-3 sm:gap-2 relative">
            <div className="flex sm:flex-col items-center relative">
              {done ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 relative z-10 bg-white rounded-full" />
              ) : (
                <Circle className={`h-6 w-6 shrink-0 relative z-10 bg-white rounded-full ${active ? "text-[#CF0A0A]" : "text-black/20"}`} />
              )}
              {idx < TIMELINE.length - 1 && (
                <span
                  className={`hidden sm:block absolute top-3 left-1/2 w-full h-0.5 ${done ? "bg-green-600" : "bg-black/10"}`}
                  aria-hidden
                />
              )}
            </div>
            <span className={`text-xs sm:text-center font-medium ${active ? "text-[#CF0A0A]" : done ? "text-black" : "text-black/40"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "pdf"] as const;

function PaymentRejectedCard({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const uploadFn = useServerFn(uploadPaymentScreenshot);
  const resubmitFn = useServerFn(resubmitPaymentScreenshot);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!file) { toast.error("Please choose a file"); return; }
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext as any)) { toast.error("Use JPG, PNG, WEBP, or PDF"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5 MB"); return; }
    setSubmitting(true);
    try {
      const dataBase64 = await fileToBase64(file);
      const { path } = await uploadFn({
        data: { fileName: file.name, contentType: file.type || "application/octet-stream", dataBase64 },
      });
      await resubmitFn({ data: { orderId, screenshotPath: path } });
      toast.success("New payment screenshot submitted for verification");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["shop", "orders"] });
      qc.invalidateQueries({ queryKey: ["shop", "order", orderId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
      <div className="flex items-start gap-3">
        <div className="grid place-items-center h-9 w-9 rounded-xl bg-red-100 text-red-700 shrink-0">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-red-800">Payment Rejected</p>
          <p className="text-xs text-red-700 mt-0.5">Please upload a new payment screenshot.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-xs font-medium cursor-pointer hover:bg-red-50">
              <Upload className="h-3.5 w-3.5" />
              {file ? file.name : "Choose file (≤5MB)"}
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <button type="button" disabled={!file || submitting} onClick={onSubmit}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#CF0A0A] text-white text-xs font-semibold hover:bg-[#a80808] disabled:opacity-50">
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
