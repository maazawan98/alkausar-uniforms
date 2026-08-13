import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  MapPin,
  School as SchoolIcon,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  X,
  ChevronRight,
  Users,
  UserRound,
  Search,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { WishlistButton } from "@/components/site/WishlistButton";
import { QuickBuyActions, RatingStars } from "@/components/site/QuickBuyActions";
import {
  listStorefrontSchools,
  listStorefrontCampuses,
  listStorefrontClasses,
  findStorefrontProducts,
  type PublicSchool,
  type PublicCampus,
  type PublicClass,
  type StorefrontProduct,
} from "@/lib/storefront.functions";


export const Route = createFileRoute("/school-uniforms")({
  head: () => ({
    meta: [
      { title: "School Uniforms — Alkausar Uniforms" },
      {
        name: "description",
        content:
          "Find your school's uniform in a few clicks. Pick school, campus, collection and class.",
      },
      { property: "og:title", content: "School Uniforms — Alkausar Uniforms" },
      {
        property: "og:description",
        content: "Guided school uniform finder — school, campus, collection, class.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SchoolUniforms,
});

/* ---------- Persistence ---------- */

const STORAGE_KEY = "alkausar:school-finder:v2";
type Collection = "boys" | "girls";
type Persisted = {
  schoolId: string | null;
  campusId: string | null;
  collection: Collection | null;
  classId: string | null;
  applied: {
    schoolId: string;
    classId: string;
    campusId: string | null;
    collection: Collection | null;
  } | null;
};
const EMPTY: Persisted = {
  schoolId: null,
  campusId: null,
  collection: null,
  classId: null,
  applied: null,
};
function loadState(): Persisted {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Persisted) };
  } catch {
    return EMPTY;
  }
}
function saveState(s: Persisted) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/* ---------- Page ---------- */

function SchoolUniforms() {
  const schoolsFn = useServerFn(listStorefrontSchools);
  const campusesFn = useServerFn(listStorefrontCampuses);
  const classesFn = useServerFn(listStorefrontClasses);
  const productsFn = useServerFn(findStorefrontProducts);

  const [hydrated, setHydrated] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [campusId, setCampusId] = useState<string | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [applied, setApplied] = useState<Persisted["applied"]>(null);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToStep = (key: string) => {
    // Wait a tick so the newly-added step is mounted.
    setTimeout(() => {
      const el = stepRefs.current[key];
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setFocusedKey(key);
      setTimeout(() => setFocusedKey((k) => (k === key ? null : k)), 1600);
    }, 120);
  };

  useEffect(() => {
    const s = loadState();
    setSchoolId(s.schoolId);
    setCampusId(s.campusId);
    setCollection(s.collection);
    setClassId(s.classId);
    setApplied(s.applied);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState({ schoolId, campusId, collection, classId, applied });
  }, [hydrated, schoolId, campusId, collection, classId, applied]);

  const schoolsQ = useQuery({
    queryKey: ["storefront", "schools"],
    queryFn: () => schoolsFn(),
    staleTime: 5 * 60_000,
  });

  const campusesQ = useQuery({
    queryKey: ["storefront", "campuses", schoolId],
    queryFn: () => campusesFn({ data: { schoolId: schoolId! } }),
    enabled: !!schoolId,
  });

  const classesQ = useQuery({
    queryKey: ["storefront", "classes", schoolId],
    queryFn: () => classesFn({ data: { schoolId: schoolId! } }),
    enabled: !!schoolId,
  });

  const productsQ = useQuery({
    queryKey: [
      "storefront",
      "products",
      applied?.schoolId,
      applied?.classId,
      applied?.campusId,
      applied?.collection,
    ],
    queryFn: () =>
      productsFn({
        data: {
          schoolId: applied!.schoolId,
          classId: applied!.classId,
          campusId: applied!.campusId,
          collection: applied!.collection,
        },
      }),
    enabled: !!applied,
  });

  const school = schoolsQ.data?.find((s) => s.id === schoolId);
  const campuses: PublicCampus[] = campusesQ.data ?? [];
  const classes: PublicClass[] = classesQ.data ?? [];
  const hasCampuses = campuses.length > 0;
  const campusLoaded = !!schoolId && !campusesQ.isLoading;
  const campusRequired = hasCampuses;

  const selectedCampus = campuses.find((c) => c.id === campusId) ?? null;
  const selectedClass = classes.find((c) => c.id === classId) ?? null;

  const canSearch =
    !!schoolId && !!collection && !!classId && (!campusRequired || !!campusId);

  const onSchoolChange = (id: string) => {
    if (id === schoolId) return;
    setSchoolId(id);
    setCampusId(null);
    setCollection(null);
    setClassId(null);
    setApplied(null);
    // Next step (campus or collection) is auto-scrolled by the effect below
    // once it appears in the `steps` array.
  };
  const onCampusChange = (id: string) => {
    if (id === campusId) return;
    setCampusId(id);
    setApplied(null);
  };
  const onCollectionChange = (c: Collection) => {
    if (c === collection) return;
    setCollection(c);
    setApplied(null);
  };
  const onClassChange = (id: string) => {
    setClassId(id);
    setApplied(null);
    scrollToStep("search-bar");
  };

  const handleSearch = () => {
    if (!canSearch) return;
    setApplied({
      schoolId: schoolId!,
      classId: classId!,
      campusId: campusRequired ? campusId : null,
      collection,
    });
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const resetAll = () => {
    setSchoolId(null);
    setCampusId(null);
    setCollection(null);
    setClassId(null);
    setApplied(null);
  };

  // Steps to render sequentially — once a step is answered, the next appears.
  const steps = useMemo(() => {
    const arr: {
      key: string;
      n: number;
      title: string;
      node: React.ReactNode;
    }[] = [];
    let n = 1;
    arr.push({
      key: "school",
      n: n++,
      title: "Select your school",
      // Rendered inline in the JSX so it can receive live search state.
      node: null,
    });
    if (schoolId && campusLoaded && hasCampuses) {
      arr.push({
        key: "campus",
        n: n++,
        title: "Select your campus",
        node: (
          <CampusChooser
            campuses={campuses}
            selectedId={campusId}
            onSelect={onCampusChange}
          />
        ),
      });
    }
    if (schoolId && (!campusRequired || campusId)) {
      arr.push({
        key: "collection",
        n: n++,
        title: "Select collection",
        node: (
          <CollectionChooser selected={collection} onSelect={onCollectionChange} />
        ),
      });
    }
    if (schoolId && collection && (!campusRequired || campusId)) {
      arr.push({
        key: "class",
        n: n++,
        title: "Select class",
        node: (
          <ClassChooser
            loading={classesQ.isLoading}
            classes={classes}
            selectedId={classId}
            onSelect={onClassChange}
          />
        ),
      });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    schoolsQ.data,
    schoolsQ.isLoading,
    schoolId,
    campusLoaded,
    hasCampuses,
    campuses,
    campusId,
    collection,
    classesQ.data,
    classesQ.isLoading,
    classes,
    classId,
  ]);

  // Auto-scroll to newly appearing step (after user interaction, not on hydration).
  const prevKeysRef = useRef<string[]>([]);
  const didFirstStepsRunRef = useRef(false);
  useEffect(() => {
    const keys = steps.map((s) => s.key);
    const prev = prevKeysRef.current;
    if (!didFirstStepsRunRef.current) {
      didFirstStepsRunRef.current = true;
      prevKeysRef.current = keys;
      return;
    }
    const added = keys.filter((k) => !prev.includes(k));
    if (added.length > 0) {
      // Scroll to the last newly-appeared step.
      scrollToStep(added[added.length - 1]);
    }
    prevKeysRef.current = keys;
  }, [steps]);

  // Filter schools by query (client-side over live list).
  const filteredSchools = useMemo(() => {
    const list = schoolsQ.data ?? [];
    const q = schoolQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => s.name.toLowerCase().includes(q));
  }, [schoolsQ.data, schoolQuery]);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pt-28 md:pt-36 pb-16 md:pb-20">
          {/* Breadcrumb — placed below the site header, above the page title */}
          <nav
            aria-label="Breadcrumb"
            className="text-[11px] uppercase tracking-[0.25em] text-white/50 mb-8 md:mb-10"
          >
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span className="mx-3 text-white/30">/</span>
            <span className="text-white/80">School Uniforms</span>
          </nav>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
            School Uniform Finder
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">
            Find the correct uniform in a few simple steps.
          </h1>
        </div>
      </section>

      <section className="bg-[#F4F4F5] pb-24 px-4 sm:px-4 sm:px-6 lg:px-10 -mt-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {steps.map((s) => (
            <div
              key={s.key}
              ref={(el) => {
                stepRefs.current[s.key] = el;
              }}
              className="scroll-mt-24"
            >
              <StepBlock n={s.n} title={s.title} focused={focusedKey === s.key}>
                {s.key === "school" ? (
                  <SchoolChooser
                    loading={schoolsQ.isLoading}
                    schools={filteredSchools}
                    totalCount={(schoolsQ.data ?? []).length}
                    selectedId={schoolId}
                    onSelect={onSchoolChange}
                    query={schoolQuery}
                    onQueryChange={setSchoolQuery}
                  />
                ) : (
                  s.node
                )}
              </StepBlock>
            </div>
          ))}

          {/* Search bar */}
          <div
            ref={(el) => {
              stepRefs.current["search-bar"] = el;
            }}
            className="sticky bottom-4 z-30 scroll-mt-24"
          >
            <div
              className={[
                "rounded-2xl bg-white border shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)] px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 transition-all",
                focusedKey === "search-bar"
                  ? "border-[#CF0A0A] ring-4 ring-[#CF0A0A]/15"
                  : "border-black/5",
              ].join(" ")}
            >
              <div className="w-full sm:flex-1 min-w-0 flex flex-wrap items-stretch gap-2">
                <Chip label="School" value={school?.name} />
                {hasCampuses && (
                  <Chip label="Campus" value={selectedCampus?.label ?? null} />
                )}
                <Chip
                  label="Collection"
                  value={collection ? (collection === "boys" ? "Boys" : "Girls") : null}
                />
                <Chip label="Class" value={selectedClass?.name ?? null} />
              </div>
              <div className="w-full sm:w-auto flex gap-2 shrink-0">
                {(schoolId || applied) && (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="h-11 flex-1 sm:flex-none px-4 rounded-xl text-xs font-semibold text-black/60 hover:text-black border border-black/10 hover:border-black/25 transition"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  disabled={!canSearch}
                  onClick={handleSearch}
                  className={[
                    "h-11 flex-1 sm:flex-none px-4 sm:px-6 rounded-xl font-semibold text-[13px] sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all",
                    canSearch
                      ? "bg-[#CF0A0A] text-white hover:bg-[#a80808] shadow-[0_12px_30px_-10px_rgba(207,10,10,0.6)]"
                      : "bg-black/5 text-black/30 cursor-not-allowed",
                  ].join(" ")}
                >
                  Search Products
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div ref={resultsRef} className="scroll-mt-24">
            {applied && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <ResultsHeader
                  school={school}
                  campusLabel={campusRequired ? selectedCampus?.label ?? null : null}
                  className_={selectedClass?.name ?? null}
                  collection={applied.collection}
                  count={productsQ.data?.length ?? 0}
                  loading={productsQ.isLoading}
                />

                {productsQ.isLoading ? (
                  <ProductGridSkeleton />
                ) : (productsQ.data?.length ?? 0) === 0 ? (
                  <EmptyResults />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {productsQ.data!.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

/* ---------- Step block ---------- */

function StepBlock({
  n,
  title,
  focused = false,
  children,
}: {
  n: number;
  title: string;
  focused?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "rounded-3xl bg-white border shadow-[0_10px_40px_-25px_rgba(0,0,0,0.25)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 transition-all",
        focused
          ? "border-[#CF0A0A] ring-4 ring-[#CF0A0A]/15"
          : "border-black/5",
      ].join(" ")}
    >
      <div className="flex items-center gap-3 px-6 md:px-8 pt-6 pb-4 border-b border-black/5">
        <span
          className={[
            "h-8 w-8 rounded-full grid place-items-center text-[13px] font-bold transition-colors",
            focused ? "bg-[#CF0A0A] text-white" : "bg-black text-white",
          ].join(" ")}
        >
          {n}
        </span>
        <h2 className="text-lg md:text-xl font-bold text-black tracking-tight">{title}</h2>
      </div>
      <div className="p-6 md:p-8">{children}</div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value?: string | null }) {
  const filled = !!value;
  return (
    <span
      className={[
        "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold border",
        filled
          ? "bg-black text-white border-black"
          : "bg-white text-black/40 border-black/10",
      ].join(" ")}
    >
      <span className="uppercase tracking-widest text-[9px] opacity-70">{label}</span>
      <span className="truncate max-w-[120px] sm:max-w-[140px]">{filled ? value : "—"}</span>
    </span>
  );
}

/* ---------- Choosers ---------- */

function SchoolChooser({
  loading,
  schools,
  totalCount,
  selectedId,
  onSelect,
  query,
  onQueryChange,
}: {
  loading: boolean;
  schools: PublicSchool[];
  totalCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (v: string) => void;
}) {
  if (loading) return <CardGridSkeleton count={8} />;
  if (totalCount === 0)
    return <InlineEmpty icon={SchoolIcon} text="No schools available yet." />;
  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search school..."
          className="w-full h-11 pl-10 pr-10 rounded-xl border-2 border-black/10 bg-white text-sm text-black placeholder:text-black/40 focus:outline-none focus:border-[#CF0A0A] focus:ring-4 focus:ring-[#CF0A0A]/10 transition"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-full text-black/40 hover:text-black hover:bg-black/5 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {schools.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center">
          <SchoolIcon className="h-7 w-7 text-black/20 mx-auto mb-2" />
          <p className="text-sm text-black/60 font-medium">
            No schools match "{query}"
          </p>
          <p className="text-xs text-black/40 mt-1">Try a different name.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {schools.map((s) => {
        const sel = s.id === selectedId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-pressed={sel}
            className={[
              "group relative rounded-2xl border-2 bg-white flex flex-col items-center transition-all overflow-hidden",
              sel
                ? "border-[#CF0A0A] bg-[#CF0A0A]/[0.03] shadow-[0_15px_35px_-15px_rgba(207,10,10,0.45)]"
                : "border-black/5 hover:border-black/25 hover:-translate-y-0.5 hover:shadow-[0_15px_35px_-20px_rgba(0,0,0,0.25)]",
            ].join(" ")}
          >
            {sel && (
              <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#CF0A0A] text-white grid place-items-center shadow z-10">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
            {/* Fixed logo area — same dimensions on every card, object-contain, centered */}
            <div className="w-full aspect-square bg-white grid place-items-center p-5">
              {s.logoUrl ? (
                <img
                  src={s.logoUrl}
                  alt={s.name}
                  className="max-h-full max-w-full object-contain"
                  style={{ maxHeight: "100%", maxWidth: "100%" }}
                />
              ) : (
                <SchoolIcon className="h-10 w-10 text-black/20" />
              )}
            </div>
            <div className="w-full border-t border-black/5 px-3 py-3 bg-[#FAFAFA]">
              <p className="text-[13px] font-semibold text-black text-center leading-tight line-clamp-2 min-h-[2.4em]">
                {s.name}
              </p>
            </div>
          </button>
        );
      })}
        </div>
      )}
    </div>
  );
}

function CampusChooser({
  campuses,
  selectedId,
  onSelect,
}: {
  campuses: PublicCampus[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {campuses.map((c) => {
        const sel = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            aria-pressed={sel}
            className={[
              "relative rounded-2xl border-2 bg-white p-5 text-left transition-all",
              sel
                ? "border-[#CF0A0A] bg-[#CF0A0A]/[0.03] shadow-[0_15px_35px_-15px_rgba(207,10,10,0.45)]"
                : "border-black/5 hover:border-black/25 hover:-translate-y-0.5 hover:shadow-[0_15px_35px_-20px_rgba(0,0,0,0.2)]",
            ].join(" ")}
          >
            {sel && (
              <span className="absolute top-3 right-3 h-6 w-6 rounded-full bg-[#CF0A0A] text-white grid place-items-center shadow">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
            <div className="flex items-start gap-3">
              <div
                className={[
                  "h-11 w-11 rounded-xl grid place-items-center shrink-0",
                  sel ? "bg-[#CF0A0A] text-white" : "bg-[#CF0A0A]/10 text-[#CF0A0A]",
                ].join(" ")}
              >
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-black text-sm truncate">
                  {c.campus_name || c.area || c.city}
                </p>
                <p className="mt-0.5 text-xs text-black/50 truncate">
                  {[c.area, c.city].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function CollectionChooser({
  selected,
  onSelect,
}: {
  selected: Collection | null;
  onSelect: (c: Collection) => void;
}) {
  const options: {
    key: Collection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tint: string;
  }[] = [
    { key: "boys", label: "Boys", icon: Users, tint: "#1E3A8A" },
    { key: "girls", label: "Girls", icon: UserRound, tint: "#BE185D" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {options.map((o) => {
        const sel = o.key === selected;
        const Icon = o.icon;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onSelect(o.key)}
            aria-pressed={sel}
            className={[
              "group relative overflow-hidden rounded-2xl border-2 bg-white p-8 flex items-center gap-5 text-left transition-all",
              sel
                ? "border-[#CF0A0A] bg-[#CF0A0A]/[0.04] shadow-[0_20px_45px_-20px_rgba(207,10,10,0.5)]"
                : "border-black/5 hover:border-black/25 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-25px_rgba(0,0,0,0.25)]",
            ].join(" ")}
          >
            {sel && (
              <span className="absolute top-3 right-3 h-6 w-6 rounded-full bg-[#CF0A0A] text-white grid place-items-center shadow">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
            <div
              className="h-16 w-16 rounded-2xl grid place-items-center shrink-0"
              style={{ backgroundColor: `${o.tint}14`, color: o.tint }}
            >
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-2xl font-bold text-black tracking-tight">{o.label}</p>
              <p className="mt-1 text-sm text-black/50">
                {o.key === "boys" ? "Boys collection" : "Girls collection"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ClassChooser({
  loading,
  classes,
  selectedId,
  onSelect,
}: {
  loading: boolean;
  classes: PublicClass[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) return <ChipGridSkeleton />;
  if (classes.length === 0)
    return <InlineEmpty icon={Tag} text="No classes configured for this school." />;
  return (
    <div className="flex flex-wrap gap-2.5">
      {classes.map((c) => {
        const sel = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            aria-pressed={sel}
            className={[
              "px-5 h-12 rounded-2xl text-sm font-semibold border-2 transition-all inline-flex items-center gap-2",
              sel
                ? "bg-[#CF0A0A] text-white border-[#CF0A0A] shadow-[0_10px_30px_-15px_rgba(207,10,10,0.6)]"
                : "bg-white text-black/70 border-black/10 hover:border-black/30 hover:text-black",
            ].join(" ")}
          >
            {sel && <Check className="h-3.5 w-3.5" />}
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Skeletons + empty ---------- */

function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border-2 border-black/5 bg-white overflow-hidden"
        >
          <div className="aspect-square bg-black/5 animate-pulse" />
          <div className="p-3">
            <div className="h-3 w-3/4 mx-auto rounded bg-black/5 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
function ChipGridSkeleton() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 w-24 rounded-2xl bg-black/5 animate-pulse" />
      ))}
    </div>
  );
}
function InlineEmpty({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center">
      <Icon className="h-8 w-8 text-black/20 mx-auto mb-3" />
      <p className="text-sm text-black/50">{text}</p>
    </div>
  );
}

/* ---------- Results ---------- */

function ResultsHeader({
  school,
  campusLabel,
  className_,
  collection,
  count,
  loading,
}: {
  school?: PublicSchool;
  campusLabel: string | null;
  className_: string | null;
  collection: Collection | null;
  count: number;
  loading: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h3 className="text-2xl md:text-3xl font-bold text-black tracking-tight">
          {loading
            ? "Loading uniforms..."
            : `${count} ${count === 1 ? "Uniform" : "Uniforms"} Available`}
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {school && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black text-white text-[11px] font-medium px-3 py-1">
              <SchoolIcon className="h-3 w-3" /> {school.name}
            </span>
          )}
          {campusLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 text-black/70 text-[11px] font-medium px-3 py-1">
              <MapPin className="h-3 w-3" /> {campusLabel}
            </span>
          )}
          {collection && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 text-black/70 text-[11px] font-medium px-3 py-1 capitalize">
              {collection}
            </span>
          )}
          {className_ && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 text-black/70 text-[11px] font-medium px-3 py-1">
              <Tag className="h-3 w-3" /> {className_}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: StorefrontProduct }) {
  const hasSale =
    product.salePriceFrom != null &&
    product.priceFrom != null &&
    product.salePriceFrom < product.priceFrom;
  const shownPrice = hasSale ? product.salePriceFrom! : product.priceFrom;
  const discountPct =
    hasSale && product.priceFrom
      ? Math.round(((product.priceFrom - product.salePriceFrom!) / product.priceFrom) * 100)
      : null;
  return (
    <article className="group relative rounded-3xl bg-white border border-black/5 overflow-hidden hover:-translate-y-1 hover:shadow-[0_28px_60px_-28px_rgba(0,0,0,0.28)] transition-all duration-300 flex flex-col">
      <Link
        to="/product/school/$id"
        params={{ id: product.id }}
        className="relative aspect-[4/5] bg-[#F7F7F7] overflow-hidden grid place-items-center"
      >
        {product.primaryImageUrl ? (
          <img
            src={product.primaryImageUrl}
            alt={product.name}
            loading="lazy"
            className="max-w-full max-h-full object-contain object-center p-4 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-black/20">
            <ShoppingBag className="h-10 w-10" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {discountPct != null && discountPct > 0 && (
            <span className="inline-flex items-center rounded-full bg-[#CF0A0A] text-white text-[10px] font-bold px-2 py-1 shadow">
              -{discountPct}%
            </span>
          )}
          {product.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black text-white text-[10px] font-semibold px-2 py-1 shadow">
              <Sparkles className="h-3 w-3" /> Featured
            </span>
          )}
          {product.is_deal && !discountPct && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#DC5F00] text-white text-[10px] font-semibold px-2 py-1 shadow">
              <Tag className="h-3 w-3" /> Deal
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3 z-10">
          <WishlistButton module="school" productId={product.id} size="sm" />
        </div>
        {product.is_out_of_stock && (
          <div className="absolute inset-0 bg-black/55 grid place-items-center">
            <span className="rounded-full bg-white text-black text-[11px] font-semibold px-3 py-1.5">
              Out of Stock
            </span>
          </div>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-1">
        {product.category_name && (
          <p className="text-[10px] uppercase tracking-widest text-black/40 font-semibold">
            {product.category_name}
          </p>
        )}
        <Link to="/product/school/$id" params={{ id: product.id }} className="block group/name">
          <h4 className="mt-1 text-[14px] font-semibold text-black leading-snug line-clamp-2 group-hover/name:text-[#CF0A0A] transition-colors min-h-[2.5rem]">
            {product.name}
          </h4>
        </Link>
        <div className="mt-1.5 min-h-[16px]">
          {product.rating > 0 && <RatingStars rating={product.rating} />}
        </div>
        <div className="mt-2 flex items-baseline gap-2 min-h-[24px]">
          {shownPrice != null ? (
            <>
              <span className="text-[17px] font-bold text-black">
                Rs {shownPrice.toLocaleString()}
              </span>
              {hasSale && (
                <span className="text-[12px] text-black/40 line-through">
                  Rs {product.priceFrom!.toLocaleString()}
                </span>
              )}
            </>
          ) : (
            <span className="text-[12px] text-black/40">Price on request</span>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-black/5">
          <QuickBuyActions
            size="sm"
            input={{
              module: "school",
              productId: product.id,
              productName: product.name,
              productImagePath: product.primaryImageUrl,
              unitPrice: shownPrice,
              size: product.sizes[0] ?? null,
              gender: product.collection_type === "boys" ? "Boys" : "Girls",
              outOfStock: product.is_out_of_stock,
            }}
          />
        </div>
      </div>
    </article>
  );
}


function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-black/5 bg-white overflow-hidden"
        >
          <div className="aspect-[4/5] bg-black/5 animate-pulse" />
          <div className="p-5 space-y-3">
            <div className="h-3 w-1/3 rounded bg-black/5 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-black/5 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-black/5 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyResults() {
  return (
    <div className="rounded-3xl border border-dashed border-black/10 bg-white p-12 text-center">
      <div className="mx-auto h-20 w-20 rounded-2xl bg-[#F7F7F7] grid place-items-center mb-5">
        <div className="relative">
          <ShoppingBag className="h-10 w-10 text-black/25" />
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#CF0A0A]/10 grid place-items-center">
            <X className="h-3.5 w-3.5 text-[#CF0A0A]" />
          </div>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-black">No products were found</h3>
      <p className="mt-2 text-sm text-black/50 max-w-md mx-auto leading-relaxed">
        Try a different class, campus or collection.
      </p>
    </div>
  );
}
