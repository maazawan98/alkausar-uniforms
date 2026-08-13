import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Factory, ShieldCheck, Award, Truck, ArrowRight, Star, Mail, Loader2, CheckCircle2, ShoppingBag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { AdvertisementPopup } from "@/components/site/AdvertisementPopup";
import { ProductBrowseCard } from "@/components/site/ProductBrowseCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  listHomepagePartners,
  listHomepageCategories,
  listHomepageAccessoryCategories,
  listHomepageMedicalProducts,
  type HomepagePartner,
  type HomepageCategory,
  type HomepageAccessoryCategory,
  type HomepageMedicalProduct,
} from "@/lib/storefront.functions";
import {
  listHomepageCollegeCategories,
  type HomepageCollegeCategory,
} from "@/lib/college-storefront.functions";
import { AppImage } from "@/components/ui/app-image";
import { listHomepageReviews, type HomepageReview } from "@/lib/reviews.functions";
import {
  listHomeSchoolFeed,
  listHomeCollegeFeed,
  listHomeMedicalFeed,
  listHomeAccessoriesFeed,
  type HomeFeed,
  type AccessoriesHomeFeed,
  type BrowseCard,
  type AccessoriesHomeCard,
} from "@/lib/browse.functions";
import { subscribeNewsletter } from "@/lib/customer-query.functions";
import { useAuthUser } from "@/hooks/use-auth-user";
import { openAuthModal } from "@/lib/auth-modal";
import { setPendingAction } from "@/lib/pending-action";
import type { ShopModule } from "@/lib/shop.functions";
import heroSchool from "@/assets/hero-school.png";
import heroMedical from "@/assets/hero-medical.png";
import heroCollege from "@/assets/hero-college.png";
import heroAccessories from "@/assets/hero-accessories.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alkausar Uniforms — Premium Manufacturing Since 1995" },
      { name: "description", content: "31+ years crafting premium school, college, medical and organizational uniforms in Pakistan. In-house manufacturing, exceptional quality." },
      { property: "og:title", content: "Alkausar Uniforms — Premium Manufacturing Since 1995" },
      { property: "og:description", content: "Uniforms crafted for comfort, quality and durability. In-house manufacturing, 31+ years of excellence." },
    ],
  }),
  component: Home,
});

const FEATURES = [
  { icon: Factory, title: "In-house Manufacturing", body: "Complete production under one roof for uncompromised quality control." },
  { icon: ShieldCheck, title: "Premium Materials", body: "Only the finest fabrics, sourced and tested for durability and comfort." },
  { icon: Award, title: "31+ Years Experience", body: "Over three decades of craftsmanship, trusted by institutions nationwide." },
  { icon: Truck, title: "Reliable Delivery", body: "Consistent, on-time supply — every season, every order, every time." },
];

type ModuleFeed = {
  key: "school" | "college" | "medical" | "accessories";
  label: string;
  hrefBase: string;
  module: ShopModule;
  cards: (BrowseCard | AccessoriesHomeCard)[];
  categoryOf?: (c: BrowseCard | AccessoriesHomeCard) => string | null;
};

function Home() {
  const schoolFn = useServerFn(listHomeSchoolFeed);
  const collegeFn = useServerFn(listHomeCollegeFeed);
  const medFn = useServerFn(listHomeMedicalFeed);
  const accFn = useServerFn(listHomeAccessoriesFeed);
  const partnersFn = useServerFn(listHomepagePartners);

  const school = useQuery<HomeFeed>({ queryKey: ["home-school"], queryFn: () => schoolFn(), staleTime: 60_000 });
  const college = useQuery<HomeFeed>({ queryKey: ["home-college"], queryFn: () => collegeFn(), staleTime: 60_000 });
  const medical = useQuery<HomeFeed>({ queryKey: ["home-medical"], queryFn: () => medFn(), staleTime: 60_000 });
  const accessories = useQuery<AccessoriesHomeFeed>({ queryKey: ["home-accessories"], queryFn: () => accFn(), staleTime: 60_000 });
  const partners = useQuery({ queryKey: ["homepage-partners"], queryFn: () => partnersFn(), staleTime: 60_000 });

  const modules = (kind: "featured" | "deal" | "latest"): ModuleFeed[] => [
    {
      key: "school",
      label: "School Uniforms",
      hrefBase: "/product/school",
      module: "school" as ShopModule,
      cards: school.data ? school.data[kind] : [],
    },
    {
      key: "college",
      label: "Colleges",
      hrefBase: "/product/college",
      module: "college" as ShopModule,
      cards: college.data ? college.data[kind] : [],
    },
    {
      key: "medical",
      label: "Medical",
      hrefBase: "/product/medical",
      module: "medical" as ShopModule,
      cards: medical.data ? medical.data[kind] : [],
    },
    {
      key: "accessories",
      label: "Accessories",
      hrefBase: "/product/accessories",
      module: "accessories" as ShopModule,
      cards: accessories.data ? accessories.data[kind] : [],
      categoryOf: (c) => (c as AccessoriesHomeCard).categoryId ?? null,
    },
  ];

  const anyLoading = school.isLoading || college.isLoading || medical.isLoading || accessories.isLoading;
  const featuredMods = modules("featured").filter((m) => m.cards.length > 0);
  const dealMods = modules("deal").filter((m) => m.cards.length > 0);

  return (
    <SiteLayout transparentHeader>
      <AdvertisementPopup />

      {/* HERO */}
      <section className="relative min-h-[80vh] lg:min-h-[92vh] bg-brand-black text-white overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at top right, rgba(207,10,10,0.28), transparent 55%), radial-gradient(ellipse 80% 60% at bottom left, rgba(220,95,0,0.22), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 pb-14 sm:pb-20 lg:pt-40 lg:pb-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 sm:px-4 py-1.5 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-orange shrink-0" /> Est. 1995 · Pakistan
              </div>
              <h1 className="mt-5 sm:mt-6 text-[26px] min-[360px]:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.05] lg:leading-[0.95] tracking-tight">
                31+ Years of<br />
                <span className="text-gradient-red">Manufacturing</span><br />
                Excellence
              </h1>
              <p className="mt-4 sm:mt-6 text-[14px] sm:text-base md:text-lg text-white/70 max-w-xl leading-relaxed font-light">
                Premium School &amp; Professional Uniforms — crafted for comfort, quality and durability.
              </p>
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-2.5 sm:gap-3">
                <Link to="/school-uniforms" className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-[#CF0A0A] hover:bg-[#DC5F00] transition-colors px-5 sm:px-6 py-3 text-[13px] sm:text-sm font-semibold">
                  Explore Collections
                  <ArrowRight className="h-4 w-4 shrink-0 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/contact" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 hover:bg-white/5 px-5 sm:px-6 py-3 text-[13px] sm:text-sm font-semibold">
                  Contact Us
                </Link>
              </div>
              <div className="mt-8 sm:mt-12 grid grid-cols-3 gap-3 sm:gap-6 max-w-md">
                <Stat number="31+" label="Years" />
                <Stat number="7 Days" label="Delivery" />
                <Stat number="100+" label="Institutions" />
              </div>

              {/* Mobile / tablet image strip */}
              <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3 lg:hidden">
                <div className="aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-elegant">
                  <img src={heroSchool} alt="School uniform by Alkausar" loading="eager" className="h-full w-full object-cover" />
                </div>
                <div className="aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-elegant">
                  <img src={heroMedical} alt="Medical uniform by Alkausar" loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-elegant">
                  <img src={heroCollege} alt="College uniform by Alkausar" loading="lazy" className="h-full w-full object-cover" />
                </div>
              </div>

            </div>

            <div className="relative h-[480px] lg:h-[600px] hidden lg:block">
              <div className="absolute top-0 right-8 w-[62%] h-[65%] rotate-[3deg] rounded-3xl overflow-hidden shadow-elegant ring-1 ring-white/10">
                <img src={heroSchool} alt="School uniform by Alkausar" loading="eager" className="h-full w-full object-cover" />
              </div>
              <div className="absolute top-[18%] left-0 w-[48%] h-[52%] -rotate-[4deg] rounded-3xl overflow-hidden shadow-elegant ring-1 ring-white/10">
                <img src={heroMedical} alt="Medical uniform by Alkausar" loading="eager" className="h-full w-full object-cover" />
              </div>
              <div className="absolute bottom-0 right-0 w-[44%] h-[38%] rotate-[2deg] rounded-3xl overflow-hidden shadow-elegant ring-1 ring-white/10">
                <img src={heroCollege} alt="College uniform by Alkausar" loading="eager" className="h-full w-full object-cover" />
              </div>
              <div className="absolute bottom-8 left-12 w-[32%] h-[28%] -rotate-[6deg] rounded-3xl overflow-hidden shadow-elegant ring-1 ring-white/10">
                <img src={heroAccessories} alt="Accessories by Alkausar" loading="eager" className="h-full w-full object-cover" />
              </div>
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-[#CF0A0A]/30 blur-3xl" />
              <div className="absolute -bottom-8 -left-8 w-56 h-56 rounded-full bg-[#DC5F00]/25 blur-3xl" />
            </div>
          </div>
        </div>
      </section>


      {/* FEATURED */}
      {(anyLoading || featuredMods.length > 0) && (
        <Section eyebrow="Featured" title="Featured Products" subtitle="Handpicked from every collection">
          {featuredMods.length === 0 && anyLoading ? (
            <SkeletonGrid />
          ) : (
            <div className="space-y-14">
              {featuredMods.map((m) => (
                <ModuleBlock key={`f-${m.key}`} mod={m} viewAllHref={viewAllHref(m.key)} />
              ))}
            </div>
          )}
        </Section>
      )}

      {/* DEALS */}
      {(anyLoading || dealMods.length > 0) && dealMods.length > 0 && (
        <Section eyebrow="Deals" title="Hot Deals" subtitle="Limited-time savings across every category" muted>
          <div className="space-y-14">
            {dealMods.map((m) => (
              <ModuleBlock key={`d-${m.key}`} mod={m} viewAllHref={viewAllHref(m.key)} />
            ))}
          </div>
        </Section>
      )}

      {/* COLLECTIONS / SHOP BY CATEGORY — category cards only */}
      <ShopByCategorySection />

      {/* PARTNERS */}
      {(partners.data ?? []).length > 0 && (
        <Section eyebrow="Partners" title="Our Partners" subtitle="Trusted by leading institutions" muted>
          <PartnersGrid partners={partners.data ?? []} />
        </Section>
      )}

      {/* WHY ALKAUSAR */}
      <section className="bg-brand-black text-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-orange font-semibold">Why Alkausar</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold">
              Crafted to last.{" "}
              <span className="text-gradient-red">Designed to fit.</span>
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-2xl p-6 bg-white/[0.03] border border-white/10 hover:border-brand-orange/50 hover:bg-white/[0.05] transition-all">
                <div className="h-11 w-11 rounded-xl grid place-items-center bg-gradient-to-br from-[#CF0A0A] to-[#DC5F00]">
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-[13px] text-white/60 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <HomepageReviewsSection />

      {/* NEWSLETTER */}
      <NewsletterSection />
    </SiteLayout>
  );
}

function viewAllHref(key: ModuleFeed["key"]): string {
  switch (key) {
    case "school": return "/school-uniforms";
    case "college": return "/colleges";
    case "medical": return "/medical";
    case "accessories": return "/accessories";
  }
}

function ModuleBlock({ mod, viewAllHref }: { mod: ModuleFeed; viewAllHref: string }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-4">
        <h3 className="text-lg md:text-xl font-bold text-brand-black">{mod.label}</h3>
        <Link to={viewAllHref} className="text-xs font-semibold uppercase tracking-widest text-brand-red hover:text-[#DC5F00] transition-colors inline-flex items-center gap-1">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {mod.cards.slice(0, 8).map((c) => (
          <ProductBrowseCard
            key={c.id}
            product={c}
            hrefBase={mod.hrefBase}
            module={mod.module}
            categoryId={mod.categoryOf ? mod.categoryOf(c) : null}
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-3xl bg-black/[0.03] aspect-[3/4] animate-pulse" />
      ))}
    </div>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{number}</div>
      <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.2em] text-white/50 mt-1">{label}</div>
    </div>

  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  children,
  muted = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section className={`py-14 md:py-20 px-4 sm:px-6 lg:px-10 ${muted ? "bg-brand-cream" : ""}`}>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            {eyebrow && <p className="text-[10px] uppercase tracking-[0.3em] text-brand-red font-semibold">{eyebrow}</p>}
            <h2 className="mt-2 text-2xl md:text-3xl lg:text-4xl font-bold text-brand-black tracking-tight">{title}</h2>
            {subtitle && <p className="mt-2 text-sm md:text-base text-brand-black/60">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

const SCHOOL_FINDER_KEY = "alkausar:school-finder:v2";
const COLLEGE_FINDER_KEY = "alkausar:college-finder:v2";

function clearFinder(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch { /* ignore */ }
}

function preselectSchool(schoolId: string) {
  try {
    window.sessionStorage.setItem(SCHOOL_FINDER_KEY, JSON.stringify({ schoolId, campusId: null, collection: null, classId: null, applied: null }));
  } catch { /* ignore */ }
}
function preselectCollege(collegeId: string) {
  try {
    window.sessionStorage.setItem(COLLEGE_FINDER_KEY, JSON.stringify({ collegeId, campusId: null, collection: null, classId: null, applied: null }));
  } catch { /* ignore */ }
}

type CatCard = { key: string; name: string; imageUrl: string | null; go: () => void };

function ShopByCategorySection() {
  const navigate = useNavigate();
  const schoolFn = useServerFn(listHomepageCategories);
  const collegeFn = useServerFn(listHomepageCollegeCategories);
  const accFn = useServerFn(listHomepageAccessoryCategories);
  const medFn = useServerFn(listHomepageMedicalProducts);

  const schoolCats = useQuery<HomepageCategory[]>({
    queryKey: ["home-cat-school"],
    queryFn: () => schoolFn(),
    staleTime: 60_000,
  });
  const collegeCats = useQuery<HomepageCollegeCategory[]>({
    queryKey: ["home-cat-college"],
    queryFn: () => collegeFn(),
    staleTime: 60_000,
  });
  const accCats = useQuery<HomepageAccessoryCategory[]>({
    queryKey: ["home-cat-accessories"],
    queryFn: () => accFn(),
    staleTime: 60_000,
  });
  const medProducts = useQuery<HomepageMedicalProduct[]>({
    queryKey: ["home-cat-medical"],
    queryFn: () => medFn(),
    staleTime: 60_000,
  });

  const loading =
    schoolCats.isLoading || collegeCats.isLoading || accCats.isLoading || medProducts.isLoading;

  const groups: { key: string; label: string; viewAll: string; cards: CatCard[] }[] = [
    {
      key: "school",
      label: "School Uniform",
      viewAll: "/school-uniforms",
      cards: (schoolCats.data ?? []).map((c) => ({
        key: `s-${c.id}`,
        name: c.name,
        imageUrl: c.imageUrl,
        go: () => {
          clearFinder(SCHOOL_FINDER_KEY);
          navigate({ to: "/school-uniforms" });
        },
      })),
    },
    {
      key: "college",
      label: "Colleges",
      viewAll: "/colleges",
      cards: (collegeCats.data ?? []).map((c) => ({
        key: `c-${c.id}`,
        name: c.name,
        imageUrl: c.imageUrl,
        go: () => {
          clearFinder(COLLEGE_FINDER_KEY);
          navigate({ to: "/colleges" });
        },
      })),
    },
    {
      key: "medical",
      label: "Medical",
      viewAll: "/medical",
      cards: (medProducts.data ?? []).map((p) => ({
        key: `m-${p.id}`,
        name: p.name,
        imageUrl: p.imageUrl,
        go: () => navigate({ to: "/product/medical/$id", params: { id: p.id } }),
      })),
    },
    {
      key: "accessories",
      label: "Accessories",
      viewAll: "/accessories",
      cards: (accCats.data ?? []).map((c) => ({
        key: `a-${c.id}`,
        name: c.name,
        imageUrl: c.imageUrl,
        go: () => navigate({ to: "/accessories/$slug", params: { slug: c.slug } }),
      })),
    },
  ];

  const visible = groups.filter((g) => g.cards.length > 0);
  if (!loading && visible.length === 0) return null;

  return (
    <Section eyebrow="Collections" title="Shop by Category" subtitle="Built for every classroom & field">
      {loading && visible.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-black/5 aspect-square animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {visible.map((g) => (
            <div key={g.key}>
              <div className="flex items-end justify-between gap-4 mb-4">
                <h3 className="text-lg md:text-xl font-bold text-brand-black">{g.label}</h3>
                <Link
                  to={g.viewAll}
                  className="text-xs font-semibold uppercase tracking-widest text-brand-red hover:text-[#DC5F00] transition-colors inline-flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {g.cards.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={c.go}
                    className="group text-left rounded-2xl border border-black/5 bg-white overflow-hidden hover:-translate-y-1 hover:border-[#CF0A0A]/40 hover:shadow-[0_20px_45px_-24px_rgba(0,0,0,0.28)] transition-all"
                  >
                    <AppImage
                      src={c.imageUrl}
                      alt={c.name}
                      className="aspect-square w-full"
                      padding="p-1.5 sm:p-2"
                      fallback={<ShoppingBag className="h-8 w-8 text-black/15" />}
                    />
                    <div className="px-3 py-3 border-t border-black/5">
                      <p className="text-[13px] font-semibold text-brand-black leading-tight text-center line-clamp-2">
                        {c.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}


function PartnersGrid({ partners }: { partners: HomepagePartner[] }) {
  const navigate = useNavigate();
  const [chooseFor, setChooseFor] = useState<HomepagePartner | null>(null);

  const goSchool = (p: HomepagePartner) => { if (!p.school) return; preselectSchool(p.school.id); navigate({ to: "/school-uniforms" }); };
  const goCollege = (p: HomepagePartner) => { if (!p.college) return; preselectCollege(p.college.id); navigate({ to: "/colleges" }); };

  const handleClick = (p: HomepagePartner) => {
    if (p.school && p.college) setChooseFor(p);
    else if (p.school) goSchool(p);
    else if (p.college) goCollege(p);
  };

  const sorted = [...partners].sort((a, b) => a.name.localeCompare(b.name));

  const Group = ({ ariaHidden }: { ariaHidden?: boolean }) => (
    <div className="flex shrink-0 gap-3 sm:gap-4" aria-hidden={ariaHidden || undefined}>
      {sorted.map((p) => (
        <button
          key={p.key}
          type="button"
          tabIndex={ariaHidden ? -1 : undefined}
          onClick={() => handleClick(p)}
          className="shrink-0 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-medium text-brand-black hover:border-brand-orange hover:bg-brand-cream transition-colors whitespace-nowrap"
        >
          {p.name}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="marquee-pause marquee-mask overflow-hidden">
        {/* Two identical groups + matching outer gap => translateX(-50%) loops seamlessly */}
        <div className="marquee-track flex w-max gap-3 sm:gap-4">
          <Group />
          <Group ariaHidden />
        </div>
      </div>


      <Dialog open={!!chooseFor} onOpenChange={(o) => !o && setChooseFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{chooseFor?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-black/60">Choose Collection</p>
          <div className="grid gap-3 mt-2">
            <button type="button" onClick={() => { if (chooseFor) { goSchool(chooseFor); setChooseFor(null); } }} className="w-full rounded-full bg-[#CF0A0A] hover:bg-[#DC5F00] text-white py-3 text-sm font-semibold transition-colors">
              School Uniforms
            </button>
            <button type="button" onClick={() => { if (chooseFor) { goCollege(chooseFor); setChooseFor(null); } }} className="w-full rounded-full border border-black/15 hover:bg-black/5 py-3 text-sm font-semibold transition-colors">
              Colleges
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function HomepageReviewsSection() {
  const fn = useServerFn(listHomepageReviews);
  const q = useQuery<HomepageReview[]>({ queryKey: ["homepage-reviews"], queryFn: () => fn() });
  const reviews = q.data ?? [];
  if (!q.isLoading && reviews.length === 0) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-10 py-14 md:py-20 bg-[#F7F5F0]">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#CF0A0A] font-semibold">Reviews</p>
          <h2 className="mt-2 text-2xl md:text-3xl lg:text-4xl font-bold text-black">
            Loved by parents and students
          </h2>
          <p className="mt-2 text-sm text-black/60">Genuine feedback from our community.</p>
        </div>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {q.isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-black/5 p-6 min-h-[200px] animate-pulse">
                  <div className="h-4 w-24 bg-black/5 rounded" />
                  <div className="mt-4 space-y-2">
                    <div className="h-3 w-full bg-black/5 rounded" />
                    <div className="h-3 w-10/12 bg-black/5 rounded" />
                    <div className="h-3 w-8/12 bg-black/5 rounded" />
                  </div>
                </div>
              ))
            : reviews.map((r) => (
                <article key={r.id} className="rounded-2xl bg-white border border-black/5 p-6 flex flex-col shadow-sm hover:shadow-md transition">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-black/15"}`} />
                    ))}
                  </div>
                  {r.review_title && <p className="mt-3 font-bold text-sm text-black">{r.review_title}</p>}
                  <p className="mt-2 text-sm text-black/70 leading-relaxed line-clamp-5 flex-1">"{r.review_text}"</p>
                  <div className="mt-5 flex items-center gap-3 pt-4 border-t border-black/5">
                    {r.customer_photo ? (
                      <img src={r.customer_photo} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-[#CF0A0A]/10 grid place-items-center text-sm font-bold text-[#CF0A0A]">
                        {r.customer_name.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-black truncate">{r.customer_name}</p>
                      <p className="text-[11px] text-black/50 truncate">{r.product_name}</p>
                    </div>
                  </div>
                </article>
              ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSection() {
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
        toast.success("Thank you for subscribing!");
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

  return (
    <section className="px-4 sm:px-6 lg:px-10 py-14 md:py-20">
      <div className="mx-auto max-w-5xl rounded-3xl p-8 md:p-12 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #CF0A0A 0%, #DC5F00 100%)" }}>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-black/20 blur-3xl" />
        <div className="relative grid md:grid-cols-[1fr_auto] items-end gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/80 font-semibold inline-flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> Newsletter
            </p>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold max-w-2xl leading-tight">
              Get updates on new collections &amp; offers
            </h2>
            <p className="mt-2 text-sm text-white/80 max-w-lg">Join our list — no spam, just the good stuff.</p>
          </div>
          {done ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Subscribed
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 min-w-[280px] md:min-w-[380px]">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="flex-1 rounded-full bg-white/95 text-black placeholder:text-black/40 px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-black/20"
              />
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black hover:bg-white hover:text-black transition-colors text-white text-sm font-semibold px-5 py-3 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
