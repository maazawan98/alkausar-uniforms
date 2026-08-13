import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AppImage } from "@/components/ui/app-image";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Menu, X, LogOut, User as UserIcon, ShieldCheck, Heart, ShoppingBag, Package, ChevronDown, ChevronRight, ImageIcon } from "lucide-react";
import { AccountModal } from "./AccountModal";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useAdminSession, useSetAdminSession } from "@/hooks/use-admin-session";
import { adminLogout } from "@/lib/admin-auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { useWishlist, useCart } from "@/hooks/use-shop";
import { subscribeAuthModal } from "@/lib/auth-modal";
import {
  listStorefrontSchools,
  listHomepageMedicalProducts,
  listHomepageAccessoryCategories,
} from "@/lib/storefront.functions";
import { listStorefrontColleges } from "@/lib/college-storefront.functions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MegaKey = "school" | "college" | "medical" | "accessories";

const NAV: Array<{ to: string; label: string; mega?: MegaKey }> = [
  { to: "/", label: "Home" },
  { to: "/school-uniforms", label: "School Uniforms", mega: "school" },
  { to: "/colleges", label: "Colleges", mega: "college" },
  { to: "/medical", label: "Medical", mega: "medical" },
  { to: "/accessories", label: "Accessories", mega: "accessories" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const SCHOOL_FINDER_KEY = "alkausar:school-finder:v2";
const COLLEGE_FINDER_KEY = "alkausar:college-finder:v2";
export function preselectSchool(schoolId: string) {
  try {
    window.sessionStorage.setItem(
      SCHOOL_FINDER_KEY,
      JSON.stringify({ schoolId, campusId: null, collection: null, classId: null, applied: null }),
    );
  } catch { /* ignore */ }
}
export function preselectCollege(collegeId: string) {
  try {
    window.sessionStorage.setItem(
      COLLEGE_FINDER_KEY,
      JSON.stringify({ collegeId, campusId: null, collection: null, classId: null, applied: null }),
    );
  } catch { /* ignore */ }
}

export function Header({ transparentOnTop = false }: { transparentOnTop?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<MegaKey | null>(null);
  const closeTimer = useRef<number | null>(null);
  const { user } = useAuthUser();
  const { data: admin } = useAdminSession();
  const adminSessionCache = useSetAdminSession();
  const logoutAdmin = useServerFn(adminLogout);
  const navigate = useNavigate();
  const { data: wishlistData } = useWishlist();
  const { data: cartData } = useCart();
  const wishlistCount = wishlistData?.length ?? 0;
  const cartCount = cartData?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const unsub = subscribeAuthModal(() => setAccountOpen(true));
    return () => { unsub(); };
  }, []);

  // Close the mobile drawer whenever the route changes.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    setOpen(false);
  }, [pathname]);


  // Mega hover intent
  const openMega = (k: MegaKey) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setActiveMega(k);
  };
  const scheduleCloseMega = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setActiveMega(null), 120);
  };

  const solid = !transparentOnTop || scrolled || !!activeMega;
  const meta = (user?.user_metadata ?? {}) as { avatar_url?: string; picture?: string; full_name?: string; name?: string };
  const avatar = meta.avatar_url || meta.picture;
  const displayName = admin ? admin.email : (meta.full_name || meta.name || user?.email || "");
  const isAuthed = !!admin || !!user;

  const signOut = async () => {
    if (admin) {
      await logoutAdmin();
      adminSessionCache.set(null);
      navigate({ to: "/" });
      return;
    }
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          solid ? "bg-white/90 backdrop-blur-xl border-b border-black/5 shadow-sm" : "bg-transparent"
        }`}
        onMouseLeave={scheduleCloseMega}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-4 sm:px-6 lg:px-10 h-16 md:h-18 flex items-center justify-between gap-3 sm:gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className={`font-logo text-xl md:text-2xl tracking-wider ${solid ? "text-brand-black" : "text-white"}`}>
              Alkausar
            </span>
            <span className={`hidden sm:inline text-[10px] uppercase tracking-[0.25em] mt-1 ${solid ? "text-brand-red" : "text-brand-orange"}`}>
              Uniforms
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            {NAV.map((n) => (
              <div
                key={n.to}
                className="relative"
                onMouseEnter={() => (n.mega ? openMega(n.mega) : scheduleCloseMega())}
              >
                <Link
                  to={n.to}
                  activeOptions={{ exact: n.to === "/" }}
                  className={`inline-flex items-center gap-1 text-[13px] font-medium tracking-wide transition-colors relative group ${
                    solid ? "text-brand-black/80 hover:text-brand-red" : "text-white/90 hover:text-white"
                  }`}
                  activeProps={{ className: solid ? "text-brand-red" : "text-white" }}
                >
                  {n.label}
                  {n.mega && <ChevronDown className={`h-3 w-3 transition-transform ${activeMega === n.mega ? "rotate-180" : ""}`} />}
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-brand-red scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </Link>
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {!admin && (
              <>
                <button
                  aria-label="Wishlist"
                  onClick={() => navigate({ to: "/wishlist" })}
                  className={`relative grid place-items-center h-10 w-10 rounded-full transition ${solid ? "hover:bg-black/5 text-brand-black" : "hover:bg-white/10 text-white"}`}
                >
                  <Heart className="h-[18px] w-[18px]" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#CF0A0A] text-white text-[10px] font-bold grid place-items-center">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </button>
                <button
                  aria-label="Cart"
                  onClick={() => navigate({ to: "/cart" })}
                  className={`relative grid place-items-center h-10 w-10 rounded-full transition ${solid ? "hover:bg-black/5 text-brand-black" : "hover:bg-white/10 text-white"}`}
                >
                  <ShoppingBag className="h-[18px] w-[18px]" />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#CF0A0A] text-white text-[10px] font-bold grid place-items-center">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {isAuthed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Account menu"
                    className={`h-10 w-10 rounded-full overflow-hidden ring-2 transition ${solid ? "ring-black/10 hover:ring-brand-red" : "ring-white/30 hover:ring-white"}`}
                  >
                    {admin ? (
                      <span className="grid h-full w-full place-items-center bg-brand-black text-white">
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                    ) : avatar ? (
                      <img src={avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center bg-brand-cream text-brand-black text-sm font-semibold">
                        {displayName.charAt(0).toUpperCase() || "U"}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5">
                  <DropdownMenuLabel className="px-3 py-2">
                    {admin && (
                      <p className="text-[10px] uppercase tracking-[0.25em] text-brand-red mb-1">Administrator</p>
                    )}
                    <p className="text-sm font-semibold text-brand-black truncate">{displayName}</p>
                    <p className="text-xs text-brand-black/50 truncate mt-0.5">{admin?.email ?? user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {admin && (
                    <DropdownMenuItem onSelect={() => navigate({ to: "/admin" })} className="rounded-xl cursor-pointer">
                      <ShieldCheck className="h-4 w-4 mr-2" /> Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  {!admin && (
                    <>
                      <DropdownMenuItem onSelect={() => navigate({ to: "/orders" })} className="rounded-xl cursor-pointer">
                        <Package className="h-4 w-4 mr-2" /> My Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => navigate({ to: "/wishlist" })} className="rounded-xl cursor-pointer">
                        <Heart className="h-4 w-4 mr-2" /> Wishlist
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => navigate({ to: "/cart" })} className="rounded-xl cursor-pointer">
                        <ShoppingBag className="h-4 w-4 mr-2" /> Cart
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onSelect={signOut} className="rounded-xl cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => setAccountOpen(true)}
                className="hidden md:inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-white bg-[#CF0A0A] hover:bg-[#DC5F00] transition-colors shadow-sm"
              >
                <UserIcon className="h-3.5 w-3.5" /> Account
              </button>
            )}

            <button
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
              className={`lg:hidden grid place-items-center h-10 w-10 rounded-full ${solid ? "text-brand-black hover:bg-black/5" : "text-white hover:bg-white/10"}`}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* MEGA MENU (Desktop) */}
        {activeMega && (
          <div
            className="hidden lg:block absolute left-0 right-0 top-full bg-white border-t border-black/5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.18)] animate-in fade-in slide-in-from-top-2 duration-200"
            onMouseEnter={() => openMega(activeMega)}
            onMouseLeave={scheduleCloseMega}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-8">
              <MegaContent kind={activeMega} onNavigate={() => setActiveMega(null)} />
            </div>
          </div>
        )}

      </header>

      {/* MOBILE MENU — rendered OUTSIDE <header> so the header's backdrop-blur
          containing block can never collapse this fixed overlay. */}
      {open && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <nav className="relative max-h-full w-full max-w-full overflow-y-auto overscroll-contain bg-white border-t border-black/5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-3 flex flex-col">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  activeOptions={{ exact: n.to === "/" }}
                  className="flex min-h-11 items-center justify-between py-3 text-[15px] font-medium text-brand-black border-b border-black/5"
                  activeProps={{ className: "text-brand-red" }}
                >
                  <span className="truncate">{n.label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-black/30" />
                </Link>
              ))}

              {!admin && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={() => { setOpen(false); navigate({ to: "/wishlist" }); }}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-medium text-brand-black"
                  >
                    <Heart className="h-4 w-4" /> Wishlist
                  </button>
                  <button
                    onClick={() => { setOpen(false); navigate({ to: "/cart" }); }}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-medium text-brand-black"
                  >
                    <ShoppingBag className="h-4 w-4" /> Cart
                  </button>
                </div>
              )}

              {isAuthed ? (
                <>
                  {admin && (
                    <button
                      onClick={() => { setOpen(false); navigate({ to: "/admin" }); }}
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-semibold text-brand-black"
                    >
                      <ShieldCheck className="h-4 w-4" /> Admin Dashboard
                    </button>
                  )}
                  {!admin && (
                    <button
                      onClick={() => { setOpen(false); navigate({ to: "/orders" }); }}
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-semibold text-brand-black"
                    >
                      <Package className="h-4 w-4" /> My Orders
                    </button>
                  )}
                  <button
                    onClick={() => { setOpen(false); signOut(); }}
                    className="mt-2 mb-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white bg-brand-black"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setOpen(false); setAccountOpen(true); }}
                  className="mt-4 mb-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white bg-[#CF0A0A]"
                >
                  <UserIcon className="h-4 w-4" /> Account
                </button>
              )}
            </div>
          </nav>
        </div>
      )}

      <AccountModal open={accountOpen} onOpenChange={setAccountOpen} />

    </>
  );
}

/* ============ MEGA CONTENT ============ */

function MegaContent({
  kind,
  compact = false,
  onNavigate,
}: {
  kind: MegaKey;
  compact?: boolean;
  onNavigate: () => void;
}) {
  const navigate = useNavigate();

  const schoolsFn = useServerFn(listStorefrontSchools);
  const collegesFn = useServerFn(listStorefrontColleges);
  const medFn = useServerFn(listHomepageMedicalProducts);
  const accFn = useServerFn(listHomepageAccessoryCategories);

  const schools = useQuery({
    queryKey: ["mega-schools"],
    queryFn: () => schoolsFn(),
    enabled: kind === "school",
    staleTime: 5 * 60_000,
  });
  const colleges = useQuery({
    queryKey: ["mega-colleges"],
    queryFn: () => collegesFn(),
    enabled: kind === "college",
    staleTime: 5 * 60_000,
  });
  const medical = useQuery({
    queryKey: ["mega-medical"],
    queryFn: () => medFn(),
    enabled: kind === "medical",
    staleTime: 5 * 60_000,
  });
  const accessories = useQuery({
    queryKey: ["mega-accessories"],
    queryFn: () => accFn(),
    enabled: kind === "accessories",
    staleTime: 5 * 60_000,
  });

  const gridCls = compact
    ? "grid grid-cols-2 gap-2"
    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3";

  if (kind === "school") {
    const items = schools.data ?? [];
    return (
      <MegaGrid
        title="Shop by School"
        loading={schools.isLoading}
        empty={items.length === 0}
        emptyMessage="No schools yet."
        gridCls={gridCls}
      >
        {items.map((s) => (
          <MegaCard
            key={s.id}
            image={s.logoUrl}
            label={s.name}
            onClick={() => { preselectSchool(s.id); navigate({ to: "/school-uniforms" }); onNavigate(); }}
            contain
          />
        ))}
      </MegaGrid>
    );
  }
  if (kind === "college") {
    const items = colleges.data ?? [];
    return (
      <MegaGrid
        title="Shop by College"
        loading={colleges.isLoading}
        empty={items.length === 0}
        emptyMessage="No colleges yet."
        gridCls={gridCls}
      >
        {items.map((c) => (
          <MegaCard
            key={c.id}
            image={c.logoUrl}
            label={c.name}
            onClick={() => { preselectCollege(c.id); navigate({ to: "/colleges" }); onNavigate(); }}
            contain
          />
        ))}
      </MegaGrid>
    );
  }
  if (kind === "medical") {
    const items = medical.data ?? [];
    return (
      <MegaGrid
        title="Featured Medical Products"
        loading={medical.isLoading}
        empty={items.length === 0}
        emptyMessage="No medical products enabled for display."
        gridCls={gridCls}
      >
        {items.map((p) => (
          <MegaCard
            key={p.id}
            image={p.imageUrl}
            label={p.name}
            onClick={() => { navigate({ to: "/product/medical/$id", params: { id: p.id } }); onNavigate(); }}
          />
        ))}
      </MegaGrid>
    );
  }
  const items = accessories.data ?? [];
  return (
    <MegaGrid
      title="Accessory Categories"
      loading={accessories.isLoading}
      empty={items.length === 0}
      emptyMessage="No accessory categories yet."
      gridCls={gridCls}
    >
      {items.map((c) => (
        <MegaCard
          key={c.id}
          image={c.imageUrl}
          label={c.name}
          onClick={() => { navigate({ to: "/accessories/$slug", params: { slug: c.slug } }); onNavigate(); }}
        />
      ))}
    </MegaGrid>
  );
}

function MegaGrid({
  title,
  loading,
  empty,
  emptyMessage,
  gridCls,
  children,
}: {
  title: string;
  loading: boolean;
  empty: boolean;
  emptyMessage: string;
  gridCls: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.28em] text-brand-red font-semibold mb-4">{title}</p>
      {loading ? (
        <div className={gridCls}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-black/5 aspect-square animate-pulse" />
          ))}
        </div>
      ) : empty ? (
        <p className="text-sm text-black/50 py-6">{emptyMessage}</p>
      ) : (
        <div className={gridCls}>{children}</div>
      )}
    </div>
  );
}

function MegaCard({
  image,
  label,
  onClick,
}: {
  image: string | null;
  label: string;
  onClick: () => void;
  contain?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-2xl border border-black/5 bg-white overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.2)] hover:border-brand-orange/50 transition-all"
    >
      <AppImage
        src={image}
        alt={label}
        className="aspect-square w-full"
        bg="bg-[#F7F5F0]"
        padding="p-3"
        fallback={<ImageIcon className="h-6 w-6 text-black/20" />}
      />
      <div className="p-2.5">
        <p className="text-[12px] font-semibold text-brand-black leading-tight line-clamp-2">{label}</p>
      </div>
    </button>
  );
}
