import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { ProductBrowseCard } from "@/components/site/ProductBrowseCard";
import { listMedicalCatalog, type BrowseCard } from "@/lib/browse.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/medical")({
  head: () => ({
    meta: [
      { title: "Medical Uniforms — Alkausar Uniforms" },
      { name: "description", content: "Lab coats, scrubs, aprons and medical accessories — engineered for hygiene, comfort and daily wear." },
      { property: "og:title", content: "Medical Uniforms — Alkausar Uniforms" },
      { property: "og:description", content: "Purpose-built medical garments — hygiene, mobility, refined tailoring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MedicalPage,
});

type Sort = "featured" | "price-asc" | "price-desc" | "newest" | "oldest";

function priceFor(p: BrowseCard): number | null {
  return p.salePriceFrom ?? p.priceFrom ?? null;
}

function MedicalPage() {
  const fn = useServerFn(listMedicalCatalog);
  const q = useQuery({ queryKey: ["storefront", "medical", "list"], queryFn: () => fn() });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("featured");
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const products = q.data ?? [];

  const facets = useMemo(() => {
    const colorMap = new Map<string, string>();
    const sizeSet = new Set<string>();
    const genderSet = new Set<string>();
    for (const p of products) {
      for (const c of p.colors) colorMap.set(c.hex.toLowerCase(), c.name);
      for (const s of p.sizes) sizeSet.add(s);
      for (const g of p.genders) genderSet.add(g);
    }
    return {
      colors: Array.from(colorMap, ([hex, name]) => ({ hex, name })).sort((a, b) => a.name.localeCompare(b.name)),
      sizes: Array.from(sizeSet).sort((a, b) => {
        const na = Number(a), nb = Number(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      }),
      genders: Array.from(genderSet).sort(),
    };
  }, [products]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (s && !p.name.toLowerCase().includes(s) && !p.quality_tags.some((t) => t.toLowerCase().includes(s))) return false;
      if (colors.length && !p.colors.some((c) => colors.includes(c.hex.toLowerCase()))) return false;
      if (sizes.length && !p.sizes.some((sz) => sizes.includes(sz))) return false;
      if (genders.length && !p.genders.some((g) => genders.includes(g))) return false;
      return true;
    });
    list = [...list];
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => (priceFor(a) ?? Infinity) - (priceFor(b) ?? Infinity));
        break;
      case "price-desc":
        list.sort((a, b) => (priceFor(b) ?? -Infinity) - (priceFor(a) ?? -Infinity));
        break;
      case "newest":
        list.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        break;
      case "oldest":
        list.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
        break;
    }
    return list;
  }, [products, search, sort, colors, sizes, genders]);

  const activeCount = colors.length + sizes.length + genders.length;
  const clearAll = () => {
    setColors([]); setSizes([]); setGenders([]); setSearch(""); setSort("featured");
  };

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const FiltersPanel = (
    <div className="space-y-8">
      {facets.colors.length > 0 && (
        <FilterSection title="Colour">
          <div className="flex flex-wrap gap-2.5">
            {facets.colors.map((c) => {
              const active = colors.includes(c.hex);
              return (
                <button
                  key={c.hex}
                  onClick={() => toggle(colors, setColors, c.hex)}
                  title={c.name}
                  aria-pressed={active}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    active ? "border-[#CF0A0A] ring-2 ring-[#CF0A0A]/20" : "border-black/10 hover:border-black/30"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              );
            })}
          </div>
        </FilterSection>
      )}

      {facets.sizes.length > 0 && (
        <FilterSection title="Size">
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => {
              const active = sizes.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggle(sizes, setSizes, s)}
                  className={`min-w-11 h-9 px-3 rounded-lg text-xs font-semibold border transition ${
                    active
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-black/10 hover:border-black/40"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </FilterSection>
      )}

      {facets.genders.length > 0 && (
        <FilterSection title="Gender">
          <div className="flex flex-col gap-2">
            {facets.genders.map((g) => {
              const active = genders.includes(g);
              return (
                <label key={g} className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(genders, setGenders, g)}
                    className="h-4 w-4 rounded border-black/20 text-[#CF0A0A] focus:ring-[#CF0A0A]"
                  />
                  <span className={active ? "font-semibold" : ""}>{g}</span>
                </label>
              );
            })}
          </div>
        </FilterSection>
      )}

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="w-full h-10 rounded-lg border border-black/10 hover:border-black/40 text-sm font-semibold transition"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Medical"
        title="Medical Products"
        description="Purpose-built garments for healthcare — hygiene, mobility and refined tailoring."
      />

      <section className="py-12 px-4 sm:px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          {/* Toolbar */}
          <div className="mb-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medical products…"
                className="w-full h-12 rounded-2xl border border-black/10 bg-white pl-11 pr-4 text-sm placeholder:text-black/40 focus:outline-none focus:border-[#CF0A0A] focus:ring-4 focus:ring-[#CF0A0A]/10 transition"
              />
            </div>

            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="h-12 rounded-2xl border-black/10 sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="price-asc">Price: Low → High</SelectItem>
                <SelectItem value="price-desc">Price: High → Low</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>

            {/* Mobile filter trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button className="lg:hidden inline-flex items-center justify-center gap-2 h-12 px-5 rounded-2xl border border-black/10 bg-white text-sm font-semibold hover:border-black/30 transition">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeCount > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-[#CF0A0A] text-white text-[10px] px-1.5 font-bold">
                      {activeCount}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] sm:w-96 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">{FiltersPanel}</div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex gap-8">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-28">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold uppercase tracking-widest">Filters</h2>
                  {activeCount > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-xs font-semibold text-[#CF0A0A] hover:underline inline-flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>
                {FiltersPanel}
              </div>
            </aside>

            {/* Products */}
            <div className="flex-1 min-w-0">
              {!q.isLoading && (
                <div className="mb-5 text-xs uppercase tracking-widest text-black/40">
                  {filtered.length} {filtered.length === 1 ? "product" : "products"}
                </div>
              )}

              {q.isLoading ? (
                <div className="py-24 grid place-items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#CF0A0A]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="mx-auto h-16 w-16 grid place-items-center rounded-full bg-black/[0.04] text-black/40">
                    <ShoppingBag className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No products match your selected filters.</h3>
                  <p className="mt-1 text-sm text-black/50">
                    Try changing or clearing one or more filters.
                  </p>
                  {activeCount > 0 && (
                    <button
                      onClick={clearAll}
                      className="mt-5 inline-flex items-center h-10 px-5 rounded-full bg-black text-white text-sm font-semibold hover:bg-black/85 transition"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                  {filtered.map((p) => (
                    <ProductBrowseCard key={p.id} product={p} hrefBase="/product/medical" module="medical" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-black/60 mb-3">{title}</h3>
      {children}
    </div>
  );
}
