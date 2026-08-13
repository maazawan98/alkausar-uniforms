import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";
import { getSchool } from "@/lib/school-uniform.functions";

export const Route = createFileRoute("/admin/school-uniform/$slug")({
  loader: async ({ params }) => {
    const school = await getSchool({ data: { slug: params.slug } });
    if (!school) throw notFound();
    return { school };
  },
  component: () => <Outlet />,
  notFoundComponent: () => (
    <div className="text-center py-20">
      <p className="text-lg font-semibold">School not found</p>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="text-center py-20">
      <p className="text-sm text-[#CF0A0A]">{error.message}</p>
    </div>
  ),
});
