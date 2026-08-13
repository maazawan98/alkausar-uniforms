import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductDetailsView } from "@/components/site/ProductDetailsView";
import { getSchoolProductDetails } from "@/lib/product-details.functions";

export const Route = createFileRoute("/product/school/$id")({
  head: () => ({
    meta: [
      { title: "Product — School Uniforms | Alkausar Uniforms" },
      { name: "description", content: "Premium school uniform crafted for classroom comfort." },
      { property: "og:title", content: "Product — School Uniforms | Alkausar Uniforms" },
      { property: "og:description", content: "Premium school uniform crafted for classroom comfort." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SchoolProductPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="py-32 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
      </div>
    </SiteLayout>
  ),
});

function SchoolProductPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getSchoolProductDetails);
  const q = useQuery({
    queryKey: ["product-details", "school", id],
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
      <ProductDetailsView product={q.data} hrefBaseForRelated="/product/school" />
    </SiteLayout>
  );
}
