import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronDown, ChevronRight, Loader2, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductBrowseCard } from "@/components/site/ProductBrowseCard";
import { getAccessoriesCategoryPage, listAccessoriesCatalogCategories, type BrowseCard } from "@/lib/browse.functions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";


export const Route = createFileRoute("/accessories/$slug")({
  head: () => ({
    meta: [
      { title: "Accessories Category — Alkausar Uniforms" },
      { name: "description", content: "Explore uniform accessories in this category." },
      { property: "og:title", content: "Accessories Category — Alkausar Uniforms" },
      { property: "og:description", content: "Explore uniform accessories in this category." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccessoriesCategoryPage,
});

type Sort = "featured" | "price-asc" | "price-desc" | "newest" | "oldest";

function priceFor(p: BrowseCard): number | null {
  return p.salePriceFrom ?? p.priceFrom ?? null;
}

function AccessoriesCategoryPage() {
  const { slug } = Route.useParams();
  const fn = useServerFn(getAccessoriesCategoryPage);
  const q = useQuery({
    queryKey: ["storefront", "accessories", "category", slug],
    queryFn: () => fn({ data: { slug } }),
  });
  const catsFn = useServerFn(listAccessoriesCatalogCategories);
  const otherCatsQ = useQuery({
    queryKey: ["storefront", "accessories", "categories"],
    queryFn: () => catsFn(),
    staleTime: 60_000,
  });
  const otherCategories = useMemo(
    () => (otherCatsQ.data ?? []).filter((c) => c.slug !== slug).slice(0, 8),
    [otherCatsQ.data, slug],
  );

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("featured");
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const products = q.data?.products ?? [];

  const facets = useMemo(() => {
    const colorMap = new Map<string, string>();
    const sizeSet = new Set<string>();
    const genderSet = new Set<string>();
    const classSet = new Set<string>();
    for (const p of products) {
      for (const c of p.colors) {
        const name = (c.name || "").trim();
        if (name) colorMap.set(name.toLowerCase(), name);
      }
      for (const s of p.sizes) if (s?.trim()) sizeSet.add(s);
      for (const g of p.genders) if (g?.trim()) genderSet.add(g);
      for (const cl of p.classes) if (cl?.trim()) classSet.add(cl);
    }
    const naturalSort = (a: string, b: string) => {
      const na = Number(a),
        nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b, undefined, { numeric: true });
    };
    return {
      colors: Array.from(colorMap.values()).sort((a, b) => a.localeCompare(b)),
      sizes: Array.from(sizeSet).sort(naturalSort),
      genders: Array.from(genderSet).sort(),
      classes: Array.from(classSet).sort(naturalSort),
    };
  }, [products]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (
        s &&
        !p.name.toLowerCase().includes(s) &&
        !p.quality_tags.some((t) => t.toLowerCase().includes(s))
      )
        return false;
      if (
        colors.length &&
        !p.colors.some((c) => colors.includes((c.name || "").toLowerCase()))
      )
        return false;
      if (sizes.length && !p.sizes.some((sz) => sizes.includes(sz))) return false;
      if (genders.length && p.genders.length > 0 && !p.genders.some((g) => genders.includes(g)))
        return false;
      if (classes.length && !p.classes.some((cl) => classes.includes(cl))) return false;
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
  }, [products, search, sort, colors, sizes, genders, classes]);

  const activeCount = colors.length + sizes.length + genders.length + classes.length;
  const clearAll = () => {
    setColors([]);
    setSizes([]);
    setGenders([]);
    setClasses([]);
    setSearch("");
    setSort("featured");
  };

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);



  const FiltersPanel = (
    <div className="space-y-8">
      {facets.colors.length > 0 && (
        <FilterSection title="Colour">
          <SearchableMultiSelect
            placeholder="Select colours"
            searchPlaceholder="Search colour…"
            options={facets.colors}
            selected={colors}
            onToggle={(v) => toggle(colors, setColors, v.toLowerCase())}
            isSelected={(v) => colors.includes(v.toLowerCase())}
          />
        </FilterSection>
      )}

      {facets.classes.length > 0 && (
        <FilterSection title="Classes">
          <SearchableMultiSelect
            placeholder="Select classes"
            searchPlaceholder="Search class…"
            options={facets.classes}
            selected={classes}
            onToggle={(v) => toggle(classes, setClasses, v)}
            isSelected={(v) => classes.includes(v)}
          />
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


  if (q.isLoading) {
    return (
      <SiteLayout>
        <div className="py-40 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#CF0A0A]" />
        </div>
      </SiteLayout>
    );
  }
  if (!q.data) throw notFound();

  const { category } = q.data;

  return (
    <SiteLayout>
      {/* Hero with breadcrumb */}
      <section className="relative bg-brand-black text-white pt-40 pb-20 overflow-hidden">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at top right, rgba(207,10,10,0.35), transparent 55%), radial-gradient(ellipse at bottom left, rgba(220,95,0,0.25), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <nav className="text-xs uppercase tracking-[0.25em] text-white/50 mb-8 flex items-center gap-2 flex-wrap">
            <Link to="/" className="hover:text-brand-orange">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/accessories" className="hover:text-brand-orange">
              Accessories
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">{category.name}</span>
          </nav>
          <h1 className="text-4xl md:text-6xl font-bold leading-[1.05]">{category.name}</h1>
          <p className="mt-4 text-sm md:text-base text-white/60">
            {products.length} {products.length === 1 ? "product" : "products"} available
          </p>
        </div>
      </section>

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
                placeholder={`Search in ${category.name}…`}
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
            {(facets.colors.length > 0 ||
              facets.sizes.length > 0 ||
              facets.genders.length > 0) && (
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
            )}

            {/* Products */}
            <div className="flex-1 min-w-0">
              <div className="mb-5 text-xs uppercase tracking-widest text-black/40">
                {filtered.length} {filtered.length === 1 ? "product" : "products"}
              </div>

              {filtered.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="mx-auto h-16 w-16 grid place-items-center rounded-full bg-black/[0.04] text-black/40">
                    <ShoppingBag className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">
                    No products match your selected filters.
                  </h3>
                  <p className="mt-1 text-sm text-black/50">
                    Try changing or clearing one or more filters.
                  </p>
                  {(activeCount > 0 || search) && (
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
                    <ProductBrowseCard key={p.id} product={p} hrefBase="/product/accessories" module="accessories" categoryId={category.id} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {otherCategories.length > 0 && (
        <section className="border-t border-black/[0.06] bg-[#FAFAFA]">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10 py-16 lg:py-20">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#CF0A0A] font-semibold">
                  Keep exploring
                </p>
                <h2 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-black">
                  Explore More Categories
                </h2>
              </div>
              <Link
                to="/accessories"
                className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-black hover:text-[#CF0A0A] transition-colors"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
              {otherCategories.map((c) => (
                <Link
                  key={c.id}
                  to="/accessories/$slug"
                  params={{ slug: c.slug }}
                  className="group relative rounded-2xl bg-white border border-black/5 overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.2)] transition-all duration-300"
                >
                  <div className="relative aspect-square bg-[#F7F7F7] overflow-hidden grid place-items-center">
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        loading="lazy"
                        className="max-w-full max-h-full object-contain object-center p-5 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-black/20">
                        <ShoppingBag className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-black leading-snug line-clamp-1 group-hover:text-[#CF0A0A] transition-colors">
                      {c.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-black/50">
                      {c.productCount} {c.productCount === 1 ? "product" : "products"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
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

function SearchableMultiSelect({
  placeholder,
  searchPlaceholder,
  options,
  selected,
  onToggle,
  isSelected,
}: {
  placeholder: string;
  searchPlaceholder: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  isSelected: (value: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find((o) => isSelected(o)) ?? selected[0])
        : `${selected.length} selected`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-full h-10 px-3 rounded-lg border text-left text-sm flex items-center justify-between gap-2 transition ${
            selected.length > 0
              ? "border-[#CF0A0A]/40 bg-[#CF0A0A]/5 text-black"
              : "border-black/10 bg-white text-black hover:border-black/30"
          }`}
        >
          <span className={selected.length === 0 ? "text-black/50" : "font-semibold"}>
            {label}
          </span>
          <ChevronDown className="h-4 w-4 opacity-60 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const active = isSelected(opt);
                return (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => onToggle(opt)}
                    className="cursor-pointer"
                  >
                    <Check className={`mr-2 h-4 w-4 ${active ? "opacity-100" : "opacity-0"}`} />
                    {opt}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

