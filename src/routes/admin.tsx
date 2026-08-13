import { createFileRoute, redirect, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Shirt,
  GraduationCap,
  Stethoscope,
  Watch,
  Link2,
  ShoppingBag,
  Users,
  Ticket,
  Star,
  Settings,
  Globe,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  Cog,
  Mail,
  MessageSquare,
} from "lucide-react";
import { getAdminSession, adminLogout } from "@/lib/admin-auth.functions";
import { ADMIN_SESSION_KEY, useSetAdminSession } from "@/hooks/use-admin-session";
import { useNewOrders } from "@/hooks/use-new-orders";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Alkausar Uniforms" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: ADMIN_SESSION_KEY,
      queryFn: () => getAdminSession(),
    });
    if (!session) throw redirect({ to: "/" });
    return { admin: session };
  },
  loader: ({ context }) => ({ admin: context.admin }),
  component: AdminLayout,
});

type NavItem = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const MAIN_NAV: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "School Uniform", to: "/admin/school-uniform", icon: Shirt },
  { label: "Colleges", to: "/admin/colleges", icon: GraduationCap },
  { label: "Medical", to: "/admin/medical", icon: Stethoscope },
  { label: "Accessories", to: "/admin/accessories", icon: Watch },
  { label: "Product Mapping", to: "/admin/product-mapping", icon: Link2 },
  { label: "Orders", to: "/admin/orders", icon: ShoppingBag },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Newsletter", to: "/admin/newsletter", icon: Mail },
  { label: "Contact Messages", to: "/admin/messages", icon: MessageSquare },
  { label: "Coupons", to: "/admin/coupons", icon: Ticket },
  { label: "Reviews", to: "/admin/reviews", icon: Star },
  { label: "Website Setting", to: "/admin/website-setting", icon: Settings },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/school-uniform": "School Uniform",
  "/admin/colleges": "Colleges",
  "/admin/medical": "Medical",
  "/admin/accessories": "Accessories",
  "/admin/product-mapping": "Product Mapping",
  "/admin/orders": "Orders",
  "/admin/customers": "Customers",
  "/admin/newsletter": "Newsletter Subscribers",
  "/admin/messages": "Contact Messages",
  "/admin/coupons": "Coupons",
  "/admin/reviews": "Reviews",
  "/admin/website-setting": "Website Setting",
};

function NavigationItem({
  item,
  isActive,
  onClick,
  badge = 0,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
  badge?: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      activeOptions={item.exact ? { exact: true } : undefined}
      className={[
        "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-[250ms]",
        isActive
          ? "bg-[#CF0A0A]/8 text-[#CF0A0A] font-semibold"
          : "text-black/70 font-medium hover:bg-black/[0.04] hover:text-black",
      ].join(" ")}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#CF0A0A]" />
      )}
      <Icon
        className="h-[18px] w-[18px] shrink-0"
        strokeWidth={isActive ? 2.25 : 1.75}
      />
      <span className="truncate">{item.label}</span>
      {badge > 0 && (
        <span className="ml-auto inline-flex min-w-[22px] items-center justify-center rounded-full bg-[#CF0A0A] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-sm animate-pulse">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function AdminLayout() {
  const { admin } = Route.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const logout = useServerFn(adminLogout);
  const adminSession = useSetAdminSession();

  const title = PAGE_TITLES[pathname] ?? "Admin";

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to);

  const { count: newOrders, markSeen } = useNewOrders();
  const onOrdersPage = pathname.startsWith("/admin/orders");
  useEffect(() => {
    if (onOrdersPage && newOrders > 0) markSeen();
  }, [onOrdersPage, newOrders, markSeen]);

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    adminSession.set(null);
    await navigate({ to: "/" });
  };

  const SidebarBody = (
    <div className="flex h-full flex-col bg-white border-r border-[#E5E7EB]">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black text-white font-logo text-base">
            A
          </div>
          <div className="min-w-0">
            <p className="font-logo text-[15px] tracking-wide text-black truncate">
              Alkausar Uniforms
            </p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-black/45 mt-0.5">
              Admin Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {MAIN_NAV.map((item) => (
          <NavigationItem
            key={item.label}
            item={item}
            isActive={isActive(item)}
            badge={item.to === "/admin/orders" ? newOrders : 0}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* Footer nav */}
      <div className="px-3 py-4 border-t border-[#E5E7EB] space-y-0.5">
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-black/70 transition-all duration-[250ms] hover:bg-black/[0.04] hover:text-black"
        >
          <Globe className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          <span className="truncate">View Website</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-black/70 transition-all duration-[250ms] hover:bg-black/[0.04] hover:text-black"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          <span className="truncate">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-40 w-[280px]">
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-[280px] max-w-[85%]">{SidebarBody}</aside>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-[280px]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between gap-4 px-4 md:px-8 h-16">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden grid place-items-center h-10 w-10 rounded-xl hover:bg-black/[0.04] transition-colors"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-lg md:text-xl font-semibold text-black truncate">
                {title}
              </h1>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E5E7EB] hover:bg-black/[0.03] transition-colors max-w-[260px]"
                >
                  <span className="text-sm font-medium text-black truncate">
                    {admin.email}
                  </span>
                  <ChevronDown className="h-4 w-4 text-black/50 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuItem className="rounded-lg cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg cursor-pointer">
                  <Cog className="h-4 w-4 mr-2" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleSignOut}
                  className="rounded-lg cursor-pointer text-[#CF0A0A] focus:text-[#CF0A0A]"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="p-3 sm:p-4 md:p-8 max-w-full overflow-x-hidden">
          <div className="bg-white rounded-2xl md:rounded-[20px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.02),0_8px_32px_-12px_rgba(0,0,0,0.06)] p-4 sm:p-6 md:p-10 min-h-[calc(100vh-8rem)]">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}
