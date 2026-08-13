import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";
import { getCollege } from "@/lib/college.functions";

export const Route = createFileRoute("/admin/colleges/$slug")({
  loader: async ({ params }) => {
    const college = await getCollege({ data: { slug: params.slug } });
    if (!college) throw notFound();
    return { college };
  },
  component: () => <Outlet />,
  notFoundComponent: () => (
    <div className="text-center py-20">
      <p className="text-lg font-semibold">College not found</p>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="text-center py-20">
      <p className="text-sm text-[#CF0A0A]">{error.message}</p>
    </div>
  ),
});
