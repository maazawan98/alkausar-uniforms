import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductDetailsView } from "@/components/site/ProductDetailsView";
import { getAccessoriesProductDetails } from "@/lib/product-details.functions";

export const Route = createFileRoute("/product/accessories/$id")({
  head: () => ({
    meta: [
      { title: "Product — Accessories | Alkausar Uniforms" },
      { name: "description", content: "Premium uniform accessories — engineered for daily wear." },
      { property: "og:title", content: "Product — Accessories | Alkausar Uniforms" },
      { property: "og:description", content: "Premium uniform accessories — engineered for daily wear." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccessoriesProductPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="py-32 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
      </div>
    </SiteLayout>
  ),
});

function AccessoriesProductPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getAccessoriesProductDetails);
  const q = useQuery({
    queryKey: ["product-details", "accessories", id],
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
      <ProductDetailsView product={q.data} hrefBaseForRelated="/product/accessories" />
    </SiteLayout>
  );
}
