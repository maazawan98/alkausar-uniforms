import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/website-setting")({
  component: () => <Outlet />,
});
