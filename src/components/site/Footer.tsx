import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Phone, MapPin, Clock, Facebook, Instagram, Youtube, Linkedin, Twitter, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getActiveBusinessInformation, WORKING_DAYS } from "@/lib/business-info.functions";
import { subscribeNewsletter } from "@/lib/customer-query.functions";
import { useAuthUser } from "@/hooks/use-auth-user";
import { openAuthModal } from "@/lib/auth-modal";
import { setPendingAction } from "@/lib/pending-action";
import { telHref, mailtoHref, whatsappHref } from "@/lib/contact-links";

function fmtTime(t: string) {
  const [h, m] = (t || "").split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m || 0).padStart(2, "0")} ${ampm}`;
}
function summarizeDays(days?: string[] | null) {
  if (!days?.length) return "";
  const order = WORKING_DAYS as readonly string[];
  const idx = days.map((d) => order.indexOf(d)).filter((i) => i >= 0).sort((a, b) => a - b);
  if (!idx.length) return "";
  const contiguous = idx.every((n, i) => i === 0 || n === idx[i - 1] + 1);
  if (contiguous && idx.length > 1) return `${order[idx[0]]} - ${order[idx[idx.length - 1]]}`;
  return idx.map((i) => order[i]).join(", ");
}

// Simple TikTok icon (lucide has no dedicated one)
function TiktokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.5 3a5.5 5.5 0 0 0 4.5 4.5v3a8.5 8.5 0 0 1-4.5-1.4v6.4a6 6 0 1 1-6-6c.3 0 .6 0 .9.1v3.1a3 3 0 1 0 2.1 2.8V3h3z" />
    </svg>
  );
}
function WhatsappIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.5 3.5A11 11 0 0 0 3.2 17.3L2 22l4.9-1.2A11 11 0 1 0 20.5 3.5zM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.7.8-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7 1-.3.1-.5 0-1-.4-1.9-1.2c-.7-.6-1.2-1.4-1.3-1.6s0-.3.1-.5c.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4s0-.3 0-.4c0-.1-.5-1.2-.7-1.7-.2-.5-.4-.4-.5-.4h-.5c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5.6.2 1 .4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1 0-.1-.2-.1-.4-.2z" />
    </svg>
  );
}

export function Footer() {
  const getInfo = useServerFn(getActiveBusinessInformation);
  const { data: info } = useQuery({
    queryKey: ["public-business-info"],
    queryFn: () => getInfo(),
    staleTime: 60_000,
  });

  const hours =
    info && info.opening_time && info.closing_time
      ? `${summarizeDays(info.working_days)} · ${fmtTime(info.opening_time)} – ${fmtTime(info.closing_time)}`
      : "—";

  const tel = telHref(info?.phone_number);
  const mail = mailtoHref(info?.email);
  const wa = whatsappHref(info?.whatsapp_url, info?.phone_number);

  const socials: Array<{ url?: string | null; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string }> = [
    { url: info?.facebook_url, icon: Facebook, label: "Facebook" },
    { url: info?.instagram_url, icon: Instagram, label: "Instagram" },
    { url: info?.whatsapp_url, icon: WhatsappIcon, label: "WhatsApp" },
    { url: info?.tiktok_url, icon: TiktokIcon, label: "TikTok" },
    { url: info?.youtube_url, icon: Youtube, label: "YouTube" },
    { url: info?.linkedin_url, icon: Linkedin, label: "LinkedIn" },
    { url: info?.twitter_url, icon: Twitter, label: "X" },
  ].filter((s) => !!s.url);

  return (
    <footer className="bg-brand-black text-white/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="font-logo text-3xl text-white tracking-wider">
                {info?.business_name || "Alkausar"}
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-brand-orange mt-1">Uniforms</span>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-white/60 max-w-sm">
              {info?.business_description ||
                "31+ Years of Manufacturing Excellence — crafting premium uniforms for schools, colleges, medical institutions and organizations across Pakistan."}
            </p>
            <div className="mt-8 space-y-1 text-sm text-white/60">
              <ContactRow icon={Phone} href={tel} label={info?.phone_number || "—"} />
              <ContactRow icon={WhatsappIcon} href={wa} label="Chat on WhatsApp" external />
              <ContactRow icon={Mail} href={mail} label={info?.email || "—"} />
              <div className="flex items-start gap-3 py-2">
                <MapPin className="h-4 w-4 text-brand-orange shrink-0 mt-0.5" />
                <span className="min-w-0 break-words">{info?.address || "—"}</span>
              </div>
              <div className="flex items-center gap-3 py-2">
                <Clock className="h-4 w-4 text-brand-orange shrink-0" />
                <span className="min-w-0 break-words">{hours}</span>
              </div>
            </div>

            {socials.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {socials.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.label}
                      href={s.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="h-9 w-9 grid place-items-center rounded-full border border-white/10 text-white/70 hover:text-white hover:border-brand-orange hover:bg-brand-orange/10 transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase mb-6">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              {[
                ["Home", "/"],
                ["School Uniforms", "/school-uniforms"],
                ["Colleges", "/colleges"],
                ["Medical", "/medical"],
                ["Accessories", "/accessories"],
                ["About", "/about"],
                ["Contact", "/contact"],
              ].map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-white/60 hover:text-brand-orange transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase mb-6">Categories</h4>
            <ul className="space-y-3 text-sm">
              {[
                ["School Uniforms", "/school-uniforms"],
                ["College Uniforms", "/colleges"],
                ["Medical Uniforms", "/medical"],
                ["Accessories", "/accessories"],
              ].map(([label, to]) => (
                <li key={to}><Link to={to} className="text-white/60 hover:text-brand-orange transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase mb-6">Newsletter</h4>
            <p className="text-sm text-white/60 mb-4">Get updates on new collections.</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} {info?.business_name || "Alkausar Uniforms"}. All Rights Reserved.</p>
          <p>Manufacturing Quality Uniforms Since 1995</p>
        </div>
      </div>
    </footer>
  );
}

function NewsletterForm() {
  const { user } = useAuthUser();
  const subscribe = useServerFn(subscribeNewsletter);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const runSubscribe = async () => {
    setBusy(true);
    try {
      const res = await subscribe();
      if (res.status === "already") {
        toast.info("You are already subscribed to our newsletter.");
      } else {
        setDone(true);
        toast.success("Thank you for subscribing!", {
          description: "You will receive updates about our latest collections and offers.",
        });
      }
      setEmail("");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not subscribe. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!user) {
      setPendingAction({ kind: "newsletter" });
      openAuthModal();
      return;
    }
    await runSubscribe();
  };

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Thank you for subscribing!</p>
          <p className="text-xs mt-1 text-emerald-100/80">You will receive updates about our latest collections and offers.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className="w-full rounded-full bg-white/5 border border-white/10 px-5 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-brand-orange"
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#CF0A0A] hover:bg-[#DC5F00] transition-colors text-white text-sm font-semibold px-5 py-3 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Subscribe
      </button>
    </form>
  );
}

function ContactRow({
  icon: Icon,
  href,
  label,
  external,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string | null;
  label: string;
  external?: boolean;
}) {
  if (!href) {
    return (
      <div className="flex items-center gap-3 py-2">
        <Icon className="h-4 w-4 text-brand-orange shrink-0" />
        <span className="min-w-0 break-words">{label}</span>
      </div>
    );
  }
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex min-h-11 items-center gap-3 -mx-2 px-2 rounded-lg hover:bg-white/5 hover:text-brand-orange transition-colors"
    >
      <Icon className="h-4 w-4 text-brand-orange shrink-0" />
      <span className="min-w-0 break-words">{label}</span>
    </a>
  );
}
