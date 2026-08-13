import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Reveal, RevealImage, Counter } from "@/components/site/Reveal";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Scissors,
  Truck,
  Award,
  Leaf,
  PackageCheck,
  RotateCcw,
  ClipboardCheck,
  MessageCircle,
  Mail,
  Video,
  Timer,
  Ban,
  Phone,
  CheckCircle2,
} from "lucide-react";

import heroImg from "@/assets/about-hero.jpg";
import storyImg from "@/assets/about-story.jpg";
import experienceImg from "@/assets/about-experience.jpg";
import materialsImg from "@/assets/about-materials.jpg";
import customImg from "@/assets/about-custom.jpg";
import sustainImg from "@/assets/about-sustain.jpg";
import ctaImg from "@/assets/about-cta.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Al Kausar Uniforms — 31+ Years of Craftsmanship" },
      {
        name: "description",
        content:
          "Since 1994, Al Kausar Uniforms has manufactured premium uniforms for schools, colleges, hospitals, aviation and corporate organizations across Pakistan.",
      },
      { property: "og:title", content: "About Al Kausar Uniforms" },
      {
        property: "og:description",
        content:
          "Crafting professional identity since 1994 — premium fabrics, custom manufacturing and three decades of trust.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

/* ---------------------------------- bits --------------------------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-brand-red">
      <span className="h-px w-8 bg-brand-red/60" />
      {children}
    </span>
  );
}

function StoryBlock({
  eyebrow,
  title,
  image,
  alt,
  reverse = false,
  children,
  tint = "bg-background",
}: {
  eyebrow: string;
  title: string;
  image: string;
  alt: string;
  reverse?: boolean;
  children: React.ReactNode;
  tint?: string;
}) {
  return (
    <section className={`py-24 md:py-32 px-4 sm:px-6 lg:px-10 ${tint}`}>
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-24">
        <Reveal
          variant={reverse ? "right" : "left"}
          className={reverse ? "lg:order-2" : ""}
        >
          <RevealImage src={image} alt={alt} ratio="aspect-[4/3]" />
        </Reveal>
        <Reveal variant="up" delay={120} className={reverse ? "lg:order-1" : ""}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            {title}
          </h2>
          <div className="mt-7 space-y-5 text-base leading-relaxed text-brand-black/60 md:text-lg">
            {children}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const STATS = [
  { value: 31, suffix: "+", label: "Years Experience" },
  { value: 1000, suffix: "+", label: "Institutional Orders" },
  { text: "Premium", label: "Fabric Quality" },
  { text: "Trusted", label: "Across Karachi" },
] as const;

const WHY = [
  {
    icon: Award,
    title: "31+ Years Experience",
    body: "Three decades of manufacturing knowledge behind every single garment we deliver.",
  },
  {
    icon: Sparkles,
    title: "Premium Materials",
    body: "Carefully sourced fabrics, durable trims and accessories built to last through daily wear.",
  },
  {
    icon: Scissors,
    title: "Custom Manufacturing",
    body: "Every order tailored to the exact identity, colours and specifications of your institution.",
  },
  {
    icon: Truck,
    title: "Reliable Delivery",
    body: "Structured production planning that keeps bulk institutional orders on schedule.",
  },
];

const RETURN_CARDS = [
  {
    icon: RotateCcw,
    title: "5-Day Returns",
    body: "Unused products may be returned within 5 days of delivery.",
  },
  {
    icon: ClipboardCheck,
    title: "Return Conditions",
    body: "Products must remain unused, unwashed and in original packaging with all tags and accessories.",
  },
  {
    icon: ShieldCheck,
    title: "Custom Orders",
    body: "Personalized and custom-manufactured uniforms cannot be returned unless the item contains a manufacturing defect or an error made by us.",
  },
];

const NON_RETURNABLE = [
  "Custom Orders",
  "Sale Items",
  "Clearance Products",
  "Used Products",
  "Washed Products",
];

const CHECKLIST = ["Original Packaging", "Original Tags", "Accessories", "Safe Repacking"];

const PROCESS = [
  "Contact Us",
  "Receive Return Address",
  "Ship Product",
  "Inspection",
  "Refund / Exchange",
];

/* ---------------------------------- page --------------------------------- */

function About() {
  return (
    <SiteLayout transparentHeader>
      {/* HERO */}
      <section className="relative isolate min-h-[92vh] overflow-hidden bg-brand-black text-white">
        <img
          src={heroImg}
          alt="Al Kausar Uniforms manufacturing floor"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full scale-105 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/75 to-brand-black/40" />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at 80% 10%, rgba(207,10,10,0.30), transparent 55%)",
          }}
        />

        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-6 pb-24 pt-40 lg:px-10">
          <Reveal variant="fade">
            <nav className="mb-10 text-[11px] uppercase tracking-[0.3em] text-white/45">
              <Link to="/" className="transition-colors hover:text-brand-orange">
                Home
              </Link>
              <span className="mx-3">/</span>
              <span className="text-white/80">About</span>
            </nav>
          </Reveal>

          <Reveal variant="up" delay={80}>
            <h1 className="max-w-5xl text-[2.6rem] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[5.2rem]">
              Crafting Professional
              <br />
              Identity Since <span className="text-brand-orange">1994</span>
            </h1>
          </Reveal>

          <Reveal variant="up" delay={220}>
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-white/65 md:text-lg">
              More than 31 years of excellence in designing and manufacturing premium
              uniforms trusted by schools, colleges, hospitals, corporate organizations
              and institutions across Pakistan.
            </p>
          </Reveal>

          <Reveal variant="up" delay={340}>
            <Link
              to="/school-uniforms"
              className="group mt-12 inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-sm font-semibold text-brand-black transition-all duration-300 hover:bg-brand-orange hover:text-white"
            >
              Explore Our Collections
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* SECTION 1 — OUR STORY */}
      <StoryBlock
        eyebrow="Heritage"
        title="Our Story"
        image={storyImg}
        alt="Master tailor inspecting a finished uniform jacket"
      >
        <p>
          Al Kausar Uniforms began with one vision — to create uniforms that represent
          professionalism, discipline and confidence.
        </p>
        <p>
          For more than three decades, we have proudly supplied premium-quality uniforms
          to educational institutions, healthcare organizations, aviation companies and
          corporate businesses throughout Pakistan.
        </p>
        <p>
          Our reputation has been built on consistency, craftsmanship and customer trust.
        </p>
      </StoryBlock>

      {/* SECTION 2 — 31+ YEARS + COUNTERS */}
      <section className="bg-brand-cream px-4 sm:px-6 py-24 md:py-32 lg:px-10">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-24">
          <Reveal variant="right" className="lg:order-2">
            <RevealImage
              src={experienceImg}
              alt="Experienced tailor stitching a uniform"
              ratio="aspect-[4/3]"
            />
          </Reveal>
          <Reveal variant="up" delay={120} className="lg:order-1">
            <Eyebrow>Excellence</Eyebrow>
            <h2 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              31+ Years of Excellence
            </h2>
            <div className="mt-7 space-y-5 text-base leading-relaxed text-brand-black/60 md:text-lg">
              <p>Every uniform reflects decades of manufacturing expertise.</p>
              <p>
                From fabric selection to final stitching, every stage follows strict
                quality standards.
              </p>
              <p>
                Our experience enables us to deliver durable, comfortable and elegant
                uniforms for every industry we serve.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="mx-auto mt-20 grid max-w-7xl grid-cols-2 gap-px overflow-hidden rounded-3xl bg-black/10 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal
              key={s.label}
              variant="up"
              delay={i * 110}
              className="flex h-full flex-col items-center justify-center bg-brand-cream px-3 py-8 text-center sm:px-6 sm:py-10"
            >
              {"value" in s ? (
                <>
                  <div className="text-3xl font-bold tracking-tight text-brand-black sm:text-4xl md:text-5xl">
                    <Counter to={s.value} suffix={s.suffix} />
                  </div>
                  <div className="mt-3 text-[10px] font-medium uppercase tracking-[0.2em] text-brand-black/45 sm:text-[11px] sm:tracking-[0.28em]">
                    {s.label}
                  </div>
                </>
              ) : (
                <div className="text-balance text-lg font-bold leading-tight tracking-tight text-brand-black sm:text-2xl md:text-3xl">
                  {`${s.text} ${s.label}`}
                </div>
              )}
            </Reveal>
          ))}
        </div>
      </section>

      {/* SECTION 3 — MATERIALS */}
      <StoryBlock
        eyebrow="Materials"
        title="Premium Quality Materials"
        image={materialsImg}
        alt="Premium fabric rolls, threads and buttons"
      >
        <p>Quality begins before stitching.</p>
        <p>
          We carefully source premium fabrics, durable trims and long-lasting accessories
          to ensure every uniform maintains its appearance and comfort even after repeated
          use.
        </p>
        <p>Only high-quality materials become part of an Al Kausar Uniform.</p>
      </StoryBlock>

      {/* SECTION 4 — CUSTOM MANUFACTURING */}
      <StoryBlock
        eyebrow="Customization"
        title="Custom Manufacturing"
        image={customImg}
        alt="Pattern cutting on navy uniform fabric"
        reverse
        tint="bg-brand-black text-white"
      >
        <p className="text-white/60">Every institution is unique.</p>
        <p className="text-white/60">
          Our manufacturing process is designed around customization.
        </p>
        <div className="flex flex-wrap gap-2.5 pt-2">
          {["Schools", "Colleges", "Hospitals", "Corporate Offices", "Aviation", "Healthcare"].map(
            (t) => (
              <span
                key={t}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-white/70 transition-colors hover:border-brand-orange/60 hover:text-white"
              >
                {t}
              </span>
            ),
          )}
        </div>
        <p className="text-white/60">
          Every order is tailored to meet the exact identity of the organization.
        </p>
      </StoryBlock>

      {/* SECTION 5 — SUSTAINABILITY */}
      <StoryBlock
        eyebrow="Responsibility"
        title="Sustainability & Responsibility"
        image={sustainImg}
        alt="Eco-friendly packaging and quality inspection"
      >
        <p>Responsible manufacturing is part of our commitment.</p>
        <p>
          We minimize waste wherever possible and use eco-friendly packaging while
          maintaining the highest standards of production and quality.
        </p>
        <div className="flex flex-wrap gap-6 pt-3">
          {[
            { icon: Leaf, label: "Eco Packaging" },
            { icon: PackageCheck, label: "Minimal Waste" },
            { icon: ShieldCheck, label: "Ethical Production" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="text-sm font-medium text-brand-black/70">{label}</span>
            </div>
          ))}
        </div>
      </StoryBlock>

      {/* SECTION 6 — WHY INSTITUTIONS CHOOSE US */}
      <section className="relative overflow-hidden bg-brand-black px-4 sm:px-6 py-28 text-white md:py-36 lg:px-10">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at 15% 0%, rgba(207,10,10,0.28), transparent 55%), radial-gradient(ellipse at 90% 100%, rgba(220,95,0,0.20), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl">
          <Reveal variant="up">
            <Eyebrow>Why Us</Eyebrow>
            <h2 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Why Institutions Choose Us
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} variant="up" delay={i * 120}>
                <div className="group h-full rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-brand-orange/40 hover:bg-white/[0.06] hover:shadow-[0_30px_60px_-25px_rgba(0,0,0,0.9)]">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-red/15 text-brand-orange transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-brand-red group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-7 text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 — PARALLAX CTA BANNER */}
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-fixed bg-center"
          style={{ backgroundImage: `url(${ctaImg})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-brand-black/80" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 py-32 text-center text-white md:py-44 lg:px-10">
          <Reveal variant="up">
            <h2 className="text-4xl font-bold leading-[1.08] tracking-tight md:text-6xl">
              Built on Trust.
              <br />
              <span className="text-brand-orange">Designed for Excellence.</span>
            </h2>
          </Reveal>
          <Reveal variant="up" delay={140}>
            <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
              Every stitch represents our commitment to quality, professionalism and
              customer satisfaction. For more than three decades, organizations have
              trusted Al Kausar Uniforms to strengthen their professional identity through
              exceptional uniforms.
            </p>
          </Reveal>
          <Reveal variant="up" delay={260}>
            <Link
              to="/school-uniforms"
              className="group mt-12 inline-flex items-center gap-3 rounded-full bg-brand-red px-9 py-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-white hover:text-brand-black"
            >
              Browse Our Collections
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* COMPANY INFORMATION */}
      <section className="bg-brand-cream px-4 sm:px-6 py-28 md:py-36 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
          <Reveal variant="left">
            <Eyebrow>Company</Eyebrow>
            <h2 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
              About Al Kausar Uniforms
            </h2>
          </Reveal>
          <Reveal variant="up" delay={120}>
            <div className="space-y-6 text-base leading-relaxed text-brand-black/60 md:text-lg">
              <p>
                Al Kausar Uniforms has proudly served educational institutions, healthcare
                organizations, aviation companies, corporate businesses, and professional
                industries for more than 31 years. Built on a foundation of quality,
                craftsmanship, and trust, we specialize in manufacturing premium uniforms
                that combine durability, comfort, and professional appearance.
              </p>
              <p>
                Every garment is carefully produced using high-quality fabrics, durable
                trims, and premium accessories while maintaining ethical manufacturing
                practices and environmentally responsible packaging. Our experienced team
                works closely with every client to deliver customized uniform solutions
                that reflect each organization's identity.
              </p>
              <p className="text-brand-black font-medium">
                At Al Kausar Uniforms, customer satisfaction is not simply a goal — it is
                the principle behind every order we deliver.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* REFUND & RETURNS */}
      <section className="overflow-x-clip px-4 sm:px-6 py-16 sm:py-24 md:py-36 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal variant="up">
            <Eyebrow>Policy</Eyebrow>
            <h2 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Refund &amp; Returns
            </h2>
          </Reveal>

          <div className="mt-10 sm:mt-16 grid gap-5 sm:gap-6 md:grid-cols-3 min-w-0">
            {RETURN_CARDS.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} variant="up" delay={i * 110}>
                <div className="group h-full min-w-0 rounded-3xl border border-black/8 bg-white p-5 sm:p-8 transition-all duration-500 hover:-translate-y-2 hover:border-brand-red/30 hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)]">
                  <span className="grid h-13 w-13 place-items-center rounded-2xl bg-brand-red/10 p-3.5 text-brand-red transition-transform duration-500 group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-6 text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-brand-black/55">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Request a return + checklist */}
          <div className="mt-6 grid gap-5 sm:gap-6 lg:grid-cols-2 min-w-0">
            <Reveal variant="left">
              <div className="h-full min-w-0 rounded-3xl bg-brand-black p-4 sm:p-9 text-white md:p-11 overflow-hidden">
                <Eyebrow>Get in touch</Eyebrow>
                <h3 className="mt-5 text-xl sm:text-2xl font-semibold md:text-3xl">
                  How to Request a Return
                </h3>
                <div className="mt-8 space-y-4">
                  <a
                    href="https://wa.me/923170022661"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex w-full max-w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 sm:px-5 py-3.5 sm:py-4 min-w-0 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-orange/50 hover:bg-white/[0.07]"
                  >
                    <span className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-xl bg-brand-red/20 text-brand-orange">
                      <MessageCircle className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] uppercase tracking-[0.28em] text-white/40">
                        WhatsApp
                      </span>
                      <span className="mt-1 block text-sm sm:text-lg font-semibold">0317-0022661</span>
                    </span>
                    <Phone className="ml-auto h-4 w-4 shrink-0 text-white/30 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                  <a
                    href="mailto:alkausaruniforms@gmail.com"
                    className="group flex w-full max-w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 sm:px-5 py-3.5 sm:py-4 min-w-0 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-orange/50 hover:bg-white/[0.07]"
                  >
                    <span className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-xl bg-brand-red/20 text-brand-orange">
                      <Mail className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] uppercase tracking-[0.28em] text-white/40">
                        Email
                      </span>
                      <span className="mt-1 block truncate text-[13px] sm:text-lg font-semibold">
                        alkausaruniforms@gmail.com
                      </span>
                    </span>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-white/30 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal variant="right" delay={100}>
              <div className="h-full min-w-0 rounded-3xl border border-black/8 bg-brand-cream p-4 sm:p-9 md:p-11 overflow-hidden">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-red/10 text-brand-red">
                  <Video className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-xl sm:text-2xl font-semibold md:text-3xl">Before Returning</h3>
                <p className="mt-3 text-sm text-brand-black/55">
                  Record a video showing:
                </p>
                <ul className="mt-6 space-y-3">
                  {CHECKLIST.map((c, i) => (
                    <Reveal as="li" key={c} variant="up" delay={i * 90}>
                      <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-3.5 sm:px-5 py-3.5 min-w-0">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-red" />
                        <span className="min-w-0 text-[13px] sm:text-sm font-medium text-brand-black/80">{c}</span>
                      </div>
                    </Reveal>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          {/* Refund timeline + non returnable */}
          <div className="mt-6 grid gap-5 sm:gap-6 lg:grid-cols-[1fr_1.15fr] min-w-0">
            <Reveal variant="up">
              <div className="h-full min-w-0 rounded-3xl border border-black/8 bg-white p-4 sm:p-9 md:p-11 overflow-hidden">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-red/10 text-brand-red">
                  <Timer className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-xl sm:text-2xl font-semibold">Refund Timeline</h3>
                <p className="mt-4 text-sm leading-relaxed text-brand-black/55">
                  Once approved, refunds are processed within
                </p>
                <div className="mt-4 flex items-baseline gap-3">
                  <Counter
                    to={5}
                    className="text-5xl sm:text-6xl font-bold tracking-tight text-brand-red"
                  />
                  <span className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-black/50">
                    Working Days
                  </span>
                </div>
                <p className="mt-6 text-sm leading-relaxed text-brand-black/55">
                  Refunds use the customer's original payment method. Shipping charges are
                  refunded only if the incorrect or defective item was supplied by Al
                  Kausar Uniforms.
                </p>
              </div>
            </Reveal>

            <Reveal variant="up" delay={120}>
              <div className="h-full min-w-0 rounded-3xl border border-black/8 bg-white p-4 sm:p-9 md:p-11 overflow-hidden">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-black/5 text-brand-black/70">
                  <Ban className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-xl sm:text-2xl font-semibold">Non Returnable</h3>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {NON_RETURNABLE.map((n, i) => (
                    <Reveal key={n} variant="up" delay={i * 80}>
                      <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-brand-cream px-3.5 sm:px-5 py-3.5 sm:py-4 min-w-0 transition-colors duration-300 hover:border-brand-red/25">
                        <Ban className="h-4 w-4 shrink-0 text-brand-red/70" />
                        <span className="min-w-0 text-[13px] sm:text-sm font-medium text-brand-black/75">{n}</span>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* RETURN PROCESS TIMELINE */}
      <section className="overflow-x-clip bg-brand-black px-4 sm:px-6 py-16 sm:py-24 text-white md:py-36 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal variant="up">
            <Eyebrow>Process</Eyebrow>
            <h2 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
              Return Process Timeline
            </h2>
          </Reveal>

          <div className="relative mt-20">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-white/10 md:left-0 md:right-0 md:top-7 md:bottom-auto md:h-px md:w-auto" />
            <ol className="grid gap-10 md:grid-cols-5 md:gap-6">
              {PROCESS.map((step, i) => (
                <Reveal as="li" key={step} variant="up" delay={i * 140}>
                  <div className="relative flex items-start gap-6 pl-0 md:block">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-brand-orange/40 bg-brand-black text-sm font-bold text-brand-orange md:mx-0">
                      {i + 1}
                    </span>
                    <div className="md:mt-6">
                      <p className="text-lg font-semibold">{step}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/35">
                        Step {String(i + 1).padStart(2, "0")}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>

          <Reveal variant="up" delay={200}>
            <Link
              to="/contact"
              className="group mt-20 inline-flex items-center gap-3 rounded-full border border-white/20 px-8 py-4 text-sm font-semibold text-white transition-all duration-300 hover:border-brand-orange hover:bg-brand-orange"
            >
              Contact Our Team
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
            </Link>
          </Reveal>
        </div>
      </section>
    </SiteLayout>
  );
}
