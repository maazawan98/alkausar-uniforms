import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Phone, Mail, MapPin, Clock, Send, Info, Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { getActiveBusinessInformation, WORKING_DAYS } from "@/lib/business-info.functions";
import { submitContactQuery } from "@/lib/customer-query.functions";
import { useAuthUser } from "@/hooks/use-auth-user";
import { openAuthModal } from "@/lib/auth-modal";
import { setPendingAction } from "@/lib/pending-action";
import { telHref, mailtoHref, whatsappHref } from "@/lib/contact-links";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Alkausar Uniforms" },
      { name: "description", content: "Get in touch with Alkausar Uniforms for quotes, custom orders and institutional partnerships." },
      { property: "og:title", content: "Contact Alkausar Uniforms" },
      { property: "og:description", content: "Reach out to discuss your institution's uniform requirements." },
    ],
  }),
  component: Contact,
});

function fmtTime(t: string) {
  const [h, m] = (t || "").split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m || 0).padStart(2, "0")} ${ampm}`;
}
function summarizeDays(days?: string[] | null) {
  if (!days?.length) return "—";
  const order = WORKING_DAYS as readonly string[];
  const idx = days.map((d) => order.indexOf(d)).filter((i) => i >= 0).sort((a, b) => a - b);
  if (!idx.length) return "—";
  const contiguous = idx.every((n, i) => i === 0 || n === idx[i - 1] + 1);
  if (contiguous && idx.length > 1) return `${order[idx[0]]} - ${order[idx[idx.length - 1]]}`;
  return idx.map((i) => order[i]).join(", ");
}

function Contact() {
  const getInfo = useServerFn(getActiveBusinessInformation);
  const { data: info } = useQuery({
    queryKey: ["public-business-info"],
    queryFn: () => getInfo(),
    staleTime: 60_000,
  });

  const hoursValue =
    info && info.opening_time && info.closing_time
      ? `${summarizeDays(info.working_days)} · ${fmtTime(info.opening_time)} – ${fmtTime(info.closing_time)}`
      : "—";

  const waLink = whatsappHref(info?.whatsapp_url, info?.phone_number);

  const INFO: Array<{
    icon: typeof Phone;
    label: string;
    value: string;
    href?: string | null;
    external?: boolean;
  }> = [
    { icon: Phone, label: "Phone", value: info?.phone_number || "—", href: telHref(info?.phone_number) },
    ...(waLink
      ? [{ icon: MessageCircle, label: "WhatsApp", value: "Chat on WhatsApp", href: waLink, external: true }]
      : []),
    { icon: Mail, label: "Email", value: info?.email || "—", href: mailtoHref(info?.email) },
    { icon: MapPin, label: "Address", value: info?.address || "—" },
    { icon: Clock, label: "Working Hours", value: hoursValue },
  ];

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Get in touch"
        title="Contact Us"
        description="We'd love to hear about your institution. Let's discuss your uniform requirements."
      />

      <section className="overflow-x-clip py-16 sm:py-24 px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-[400px_minmax(0,1fr)] gap-8 lg:gap-12 min-w-0">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-red">Reach Us</p>
            <h2 className="mt-3 text-3xl font-bold">Contact Information</h2>
            <p className="mt-4 text-brand-black/60">Fill out the form or use any of the channels below.</p>
            <div className="mt-8 sm:mt-10 space-y-4 sm:space-y-5 min-w-0">
              {INFO.map((i) => {
                const inner = (
                  <>
                    <div className="h-11 w-11 rounded-xl grid place-items-center bg-gradient-to-br from-[#CF0A0A] to-[#DC5F00] shrink-0">
                      <i.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-widest text-black/40">{i.label}</div>
                      <div className="mt-1 text-sm font-medium text-brand-black break-words">{i.value}</div>
                    </div>
                  </>
                );
                const cls =
                  "flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-black/5 min-w-0";
                return i.href ? (
                  <a
                    key={i.label}
                    href={i.href}
                    {...(i.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`${cls} transition-colors hover:border-brand-red/40 hover:bg-brand-cream`}
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={i.label} className={cls}>
                    {inner}
                  </div>
                );
              })}
            </div>

            {info?.business_note && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-5">
                <Info className="h-5 w-5 text-brand-orange shrink-0 mt-0.5" />
                <p className="text-sm text-brand-black/80 whitespace-pre-wrap">{info.business_note}</p>
              </div>
            )}
          </div>

          <ContactForm />
        </div>
      </section>

      <section className="pb-24 px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          {info?.google_maps_link ? (
            <a
              href={info.google_maps_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-[16/6] rounded-3xl bg-gradient-to-br from-neutral-200 to-neutral-100 border border-black/5 relative overflow-hidden group"
            >
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.04) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <MapPin className="h-8 w-8 text-brand-red mx-auto" />
                  <p className="mt-3 text-sm font-semibold text-brand-black group-hover:text-brand-red transition-colors">Open on Google Maps</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.3em] text-black/40">View our location</p>
                </div>
              </div>
            </a>
          ) : (
            <div className="aspect-[16/6] rounded-3xl bg-gradient-to-br from-neutral-200 to-neutral-100 border border-black/5 grid place-items-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.04) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
              <div className="relative text-center">
                <MapPin className="h-8 w-8 text-brand-red mx-auto" />
                <p className="mt-3 text-xs uppercase tracking-[0.3em] text-black/40">Map placeholder</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function ContactForm() {
  const { user } = useAuthUser();
  const submit = useServerFn(submitContactQuery);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  

  // Prefill from signed-in user
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        full_name: f.full_name || (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || "",
        email: f.email || user.email || "",
      }));
    }
  }, [user]);

  const doSubmit = async (payload: typeof form) => {
    setBusy(true);
    try {
      await submit({
        data: {
          full_name: payload.full_name.trim(),
          email: payload.email.trim(),
          phone: payload.phone.trim() || null,
          subject: payload.subject.trim() || null,
          message: payload.message.trim(),
        },
      });
      setDone(true);
      setForm({ full_name: "", email: "", phone: "", subject: "", message: "" });
      toast.success("Thank you for contacting us.", {
        description: "We have received your message and will get back to you as soon as possible.",
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // Pending "contact" replay is handled by PendingActionRunner (global).


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!form.full_name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in name, email and message.");
      return;
    }
    if (!user) {
      setPendingAction({ kind: "contact", payload: { ...form } });
      openAuthModal();
      return;
    }
    await doSubmit(form);
  };

  if (done) {
    return (
      <div className="rounded-3xl bg-white border border-black/5 p-10 md:p-14 shadow-card flex flex-col items-center text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-500/10 grid place-items-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="mt-6 text-2xl font-bold">Thank you for contacting us.</h3>
        <p className="mt-3 text-sm text-brand-black/60 max-w-md">
          We have received your message and will get back to you as soon as possible.
        </p>
        <button
          onClick={() => setDone(false)}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-black/10 hover:bg-brand-cream px-6 py-3 text-sm font-semibold"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl bg-white border border-black/5 p-8 md:p-12 shadow-card">
      <h3 className="text-2xl font-bold">Send a message</h3>
      <p className="mt-2 text-sm text-brand-black/60">We'll get back to you shortly.</p>
      <div className="mt-8 grid sm:grid-cols-2 gap-5">
        <Field label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
        <Field label="Subject" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} />
      </div>
      <div className="mt-5">
        <label className="text-xs uppercase tracking-widest text-black/50">Message</label>
        <textarea
          rows={5}
          required
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="mt-2 w-full rounded-2xl border border-black/10 bg-brand-cream/50 px-5 py-4 text-sm focus:outline-none focus:border-brand-orange focus:bg-white transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#CF0A0A] hover:bg-[#DC5F00] transition-colors text-white px-8 py-4 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {busy ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  required,
}: {
  label: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-black/50">
        {label}
        {required && <span className="text-brand-red"> *</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-2 w-full rounded-full border border-black/10 bg-brand-cream/50 px-5 py-3.5 text-sm focus:outline-none focus:border-brand-orange focus:bg-white transition-colors"
      />
    </div>
  );
}
