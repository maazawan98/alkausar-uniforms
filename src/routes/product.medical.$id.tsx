import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductDetailsView } from "@/components/site/ProductDetailsView";
import { getMedicalProductDetails } from "@/lib/product-details.functions";

export const Route = createFileRoute("/product/medical/$id")({
  head: () => ({
    meta: [
      { title: "Product — Medical | Alkausar Uniforms" },
      { name: "description", content: "Purpose-built medical garments — hygiene, mobility and refined tailoring." },
      { property: "og:title", content: "Product — Medical | Alkausar Uniforms" },
      { property: "og:description", content: "Purpose-built medical garments — hygiene, mobility and refined tailoring." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MedicalProductPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="py-32 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
      </div>
    </SiteLayout>
  ),
});

function MedicalProductPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getMedicalProductDetails);
  const q = useQuery({
    queryKey: ["product-details", "medical", id],
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
      <ProductDetailsView product={q.data} hrefBaseForRelated="/product/medical" />
    </SiteLayout>
  );
}
