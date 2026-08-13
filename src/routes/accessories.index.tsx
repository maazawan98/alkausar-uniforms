import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Package, ShoppingBag } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { listAccessoriesCatalogCategories } from "@/lib/browse.functions";

export const Route = createFileRoute("/accessories/")({
  head: () => ({
    meta: [
      { title: "Accessories — Alkausar Uniforms" },
      { name: "description", content: "School bags, belts, ties, caps, socks, shoes, water bottles and ID cards — every detail, in-house." },
      { property: "og:title", content: "Accessories — Alkausar Uniforms" },
      { property: "og:description", content: "Uniform accessories manufactured with the same premium quality standards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccessoriesPage,
});

function AccessoriesPage() {
  const fn = useServerFn(listAccessoriesCatalogCategories);
  const q = useQuery({ queryKey: ["storefront", "accessories", "categories"], queryFn: () => fn() });
  const cats = q.data ?? [];

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Categories"
        title="Accessories"
        description="Every finishing detail — held to the same standard of craftsmanship as our uniforms."
      />

      <section className="py-14 px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          {q.isLoading ? (
            <div className="py-24 grid place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#CF0A0A]" />
            </div>
          ) : cats.length === 0 ? (
            <div className="py-24 text-center">
              <div className="mx-auto h-16 w-16 grid place-items-center rounded-full bg-black/[0.04] text-black/40">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No categories yet</h3>
              <p className="mt-1 text-sm text-black/50">Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {cats.map((c) => (
                <Link
                  key={c.id}
                  to="/accessories/$slug"
                  params={{ slug: c.slug }}
                  className="group rounded-3xl bg-white border border-black/5 overflow-hidden hover:border-[#DC5F00] hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)] transition-all"
                >
                  <div className="relative aspect-square bg-[#F7F7F7] overflow-hidden">
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        loading="lazy"
                        className="absolute inset-0 m-auto max-w-full max-h-full object-contain object-center p-5 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-black/20">
                        <Package className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold truncate">{c.name}</h3>
                      <p className="mt-0.5 text-[11px] uppercase tracking-widest text-[#CF0A0A]">
                        Explore
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-black/[0.04] text-black/70 text-[11px] font-semibold px-2.5 py-1 shrink-0">
                      {c.productCount}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
