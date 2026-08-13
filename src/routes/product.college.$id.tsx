import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductDetailsView } from "@/components/site/ProductDetailsView";
import { getCollegeProductDetails } from "@/lib/product-details.functions";

export const Route = createFileRoute("/product/college/$id")({
  head: () => ({
    meta: [
      { title: "Product — Colleges | Alkausar Uniforms" },
      { name: "description", content: "Premium college uniform designed for comfort and identity." },
      { property: "og:title", content: "Product — Colleges | Alkausar Uniforms" },
      { property: "og:description", content: "Premium college uniform designed for comfort and identity." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CollegeProductPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="py-32 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
      </div>
    </SiteLayout>
  ),
});

function CollegeProductPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getCollegeProductDetails);
  const q = useQuery({
    queryKey: ["product-details", "college", id],
    queryFn: () => fn({ data: { id } }),
  });

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

  return (
    <SiteLayout>
      <ProductDetailsView product={q.data} hrefBaseForRelated="/product/college" />
    </SiteLayout>
  );
}
