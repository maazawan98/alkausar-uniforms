import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/product-mapping")({
  component: () => <Outlet />,
});
