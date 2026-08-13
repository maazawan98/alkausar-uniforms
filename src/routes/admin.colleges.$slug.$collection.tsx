import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";

const VALID = new Set(["boys", "girls"]);

export const Route = createFileRoute("/admin/colleges/$slug/$collection")({
  beforeLoad: ({ params }) => {
    if (!VALID.has(params.collection)) throw notFound();
  },
  component: () => <Outlet />,
});
