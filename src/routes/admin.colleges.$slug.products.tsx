import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Download,
  PackageOpen,
  Search,
  ShoppingBag,
  Star,
  Lock,
  Layers,
  Users,
  Grid3x3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCollege } from "@/lib/college.functions";
import {
  getProduct,
  listCollegeProducts,
  type ProductDetail,
  type CollegeProductRow,
} from "@/lib/college-product.functions";
import { getProductsExport } from "@/lib/college-product-export.functions";
import { downloadProductsExport } from "@/lib/college-product-export";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/colleges/$slug/products")({
  loader: async ({ params }) => {
    const college = await getCollege({ data: { slug: params.slug } });
    if (!college) throw notFound();
    return { college };
  },
  component: AllProductsView,
  notFoundComponent: () => (
    <div className="text-center py-20 text-sm text-black/50">College not found</div>
  ),
  errorComponent: ({ error }) => (
    <div className="text-center py-20 text-sm text-[#CF0A0A]">{error.message}</div>
  ),
});

type StatusFilter = "all" | "active" | "inactive" | "featured" | "deal" | "out";
type CollectionFilter = "all" | "boys" | "girls";

function formatPrice(n: number | null) {
  if (n == null) return "—";
  return `Rs. ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function AllProductsView() {
  const { college } = Route.useLoaderData();
  const { slug } = Route.useParams();

  const listFn = useServerFn(listCollegeProducts);
  const exportFn = useServerFn(getProductsExport);
  const [exporting, setExporting] = useState(false);
  const dataQ = useQuery({
    queryKey: ["college-products", college.id],
    queryFn: () => listFn({ data: { collegeId: college.id } }),
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const payload = await exportFn({ data: { collegeId: college.id } });
      if (!payload.rows.length) {
        toast.info("No products to export");
        return;
      }
      await downloadProductsExport(payload);
      toast.success("Export ready");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState<CollectionFilter>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = dataQ.data?.rows ?? [];
  const categories = dataQ.data?.categories ?? [];

  const availableCategories = useMemo(
    () =>
      categories.filter((c) => collection === "all" || c.collection_type === collection),
    [categories, collection],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (collection !== "all" && p.collection_type !== collection) return false;
      if (categoryId !== "all" && p.category_id !== categoryId) return false;
      switch (status) {
        case "active":
          return p.is_active && !p.is_out_of_stock;
        case "inactive":
          return !p.is_active;
        case "featured":
          return p.is_featured;
        case "deal":
          return p.is_deal;
        case "out":
          return p.is_out_of_stock;
        default:
          return true;
      }
    });
  }, [rows, search, collection, categoryId, status]);

  const stats = useMemo(() => {
    const boys = rows.filter((r) => r.collection_type === "boys").length;
    const girls = rows.filter((r) => r.collection_type === "girls").length;
    const cats = new Set(rows.map((r) => r.category_id)).size;
    return { total: rows.length, boys, girls, cats };
  }, [rows]);

  return (
    <TooltipProvider delayDuration={200}>
      <div>
        <Link
          to="/admin/colleges/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1.5 text-sm text-black/60 hover:text-black mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {college.name}
        </Link>

        {/* Header */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-5">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7280]">
              {college.name}
            </p>
            <h2 className="mt-1 text-[26px] md:text-[30px] font-bold text-black tracking-tight">
              View All Products
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Browse every product created for this college. This page is read-only.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-black/[0.06] text-[11px] font-semibold tracking-wider text-black/70 uppercase shrink-0">
            <Lock className="h-3 w-3" />
            Read Only
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard icon={<ShoppingBag className="h-4 w-4" />} label="Total Products" value={stats.total} tone="black" />
          <StatCard icon={<Users className="h-4 w-4" />} label="Boys Products" value={stats.boys} tone="blue" />
          <StatCard icon={<Users className="h-4 w-4" />} label="Girls Products" value={stats.girls} tone="pink" />
          <StatCard icon={<Grid3x3 className="h-4 w-4" />} label="Categories" value={stats.cats} tone="orange" />
        </div>

        {/* Toolbar */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3 mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product..."
              className="pl-9 h-9 rounded-lg border-[#E5E7EB] bg-[#F8F9FB]"
            />
          </div>
          <Select
            value={collection}
            onValueChange={(v) => {
              setCollection(v as CollectionFilter);
              setCategoryId("all");
            }}
          >
            <SelectTrigger className="h-9 w-[140px] rounded-lg border-[#E5E7EB] bg-white">
              <SelectValue placeholder="Collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Collections</SelectItem>
              <SelectItem value="boys">Boys</SelectItem>
              <SelectItem value="girls">Girls</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9 w-[180px] rounded-lg border-[#E5E7EB] bg-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {availableCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-[150px] rounded-lg border-[#E5E7EB] bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="deal">Deals</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button
              variant="outline"
              className="h-9 rounded-lg border-[#E5E7EB] text-black/70"
              onClick={handleExport}
              disabled={exporting || dataQ.isLoading || rows.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? "Exporting…" : "Export"}
            </Button>
          </div>
        </div>

        {/* Table */}
        {dataQ.isLoading ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-sm text-black/50">
            Loading products…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-white">
            <PackageOpen className="mx-auto h-10 w-10 text-black/25" />
            <p className="mt-3 text-lg font-semibold text-black">No Products Found</p>
            <p className="text-sm text-[#6B7280] mt-1">
              This college doesn't have any products yet.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-10 text-center">
            <p className="text-sm font-medium text-black">No products match your filters.</p>
            <p className="text-xs text-[#6B7280] mt-1">Try clearing search or changing filters.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8F9FB] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] sticky top-0 z-10">
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="w-[76px] px-3 py-3 text-left">Image</th>
                    <th className="px-3 py-3 text-left">Product Name</th>
                    <th className="px-3 py-3 text-left">Collection</th>
                    <th className="px-3 py-3 text-left hidden lg:table-cell">Category</th>
                    <th className="px-3 py-3 text-left hidden xl:table-cell">Sizes</th>
                    <th className="px-3 py-3 text-right">Price</th>
                    <th className="px-3 py-3 text-left hidden lg:table-cell">Campus</th>
                    <th className="px-3 py-3 text-left hidden xl:table-cell">Class</th>
                    <th className="px-3 py-3 text-left">Status</th>
                    <th className="px-3 py-3 text-right hidden md:table-cell">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <ProductRow
                      key={p.id}
                      p={p}
                      collegeName={college.name}
                      onOpen={() => setOpenId(p.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-[#E5E7EB] text-xs text-[#6B7280]">
              Showing <span className="font-medium text-black">{filtered.length}</span> of{" "}
              <span className="font-medium text-black">{rows.length}</span> products
            </div>
          </div>
        )}

        <ProductDetailsDrawer
          productId={openId}
          collegeName={college.name}
          onClose={() => setOpenId(null)}
        />
      </div>
    </TooltipProvider>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "black" | "blue" | "pink" | "orange";
}) {
  const map: Record<string, string> = {
    black: "bg-black/[0.06] text-black",
    blue: "bg-[#2563EB]/10 text-[#2563EB]",
    pink: "bg-[#DB2777]/10 text-[#DB2777]",
    orange: "bg-[#DC5F00]/10 text-[#DC5F00]",
  };
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-xl grid place-items-center ${map[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-[#6B7280] font-semibold">{label}</p>
        <p className="text-lg font-bold text-black tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );
}

function ProductRow({
  p,
  collegeName,
  onOpen,
}: {
  p: CollegeProductRow;
  collegeName: string;
  onOpen: () => void;
}) {
  const collLabel = p.collection_type === "boys" ? "Boys" : "Girls";
  const customerPreview = `${collegeName} ${collLabel} ${p.name} ${p.category_name}`.trim();
  const priceLabel =
    p.priceFrom == null
      ? "—"
      : p.priceTo != null && p.priceTo !== p.priceFrom
        ? `From ${formatPrice(p.priceFrom)}`
        : formatPrice(p.priceFrom);

  const campusLabel =
    p.campusNames.length === 0
      ? "All Campuses"
      : p.campusNames.length <= 2
        ? p.campusNames.join(", ")
        : `${p.campusNames.length} Campuses`;

  const classLabel =
    p.classNames.length === 0
      ? "—"
      : p.classNames.length <= 2
        ? p.classNames.join(", ")
        : `${p.classNames.length} Classes`;

  return (
    <tr
      onClick={onOpen}
      className="border-b border-[#F1F2F4] last:border-b-0 hover:bg-[#F8F9FB] cursor-pointer transition-colors"
    >
      <td className="px-3 py-3 align-middle">
        <div className="h-[60px] w-[60px] rounded-lg bg-[#F5F5F5] overflow-hidden grid place-items-center">
          {p.primaryImageUrl ? (
            <img src={p.primaryImageUrl} alt={p.name} className="max-h-full max-w-full object-contain p-1.5" />
          ) : (
            <PackageOpen className="h-5 w-5 text-black/25" />
          )}
        </div>
      </td>
      <td className="px-3 py-3 align-middle max-w-[280px]">
        <p className="text-sm font-semibold text-black truncate">{p.name}</p>
        <p className="text-[12px] text-[#6B7280] truncate mt-0.5">{customerPreview}</p>
      </td>
      <td className="px-3 py-3 align-middle">
        <CollectionBadge type={p.collection_type} />
      </td>
      <td className="px-3 py-3 align-middle hidden lg:table-cell">
        <span className="text-sm text-black/70">{p.category_name}</span>
      </td>
      <td className="px-3 py-3 align-middle hidden xl:table-cell">
        {p.sizes.length ? (
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            {p.sizes.slice(0, 4).map((s) => (
              <span
                key={s}
                className="inline-flex items-center rounded-md bg-[#F3F4F6] text-black/70 text-[11px] font-medium px-1.5 py-0.5"
              >
                {s}
              </span>
            ))}
            {p.sizes.length > 4 && (
              <span className="text-[11px] text-[#6B7280]">+{p.sizes.length - 4}</span>
            )}
          </div>
        ) : (
          <span className="text-[#9CA3AF] text-sm">—</span>
        )}
      </td>
      <td className="px-3 py-3 align-middle text-right">
        <span className="text-sm font-semibold text-black tabular-nums whitespace-nowrap">
          {priceLabel}
        </span>
      </td>
      <td className="px-3 py-3 align-middle hidden lg:table-cell">
        {p.campusNames.length > 2 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm text-black/70 underline decoration-dotted">{campusLabel}</span>
            </TooltipTrigger>
            <TooltipContent>{p.campusNames.join(", ")}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-sm text-black/70">{campusLabel}</span>
        )}
      </td>
      <td className="px-3 py-3 align-middle hidden xl:table-cell">
        {p.classNames.length > 2 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm text-black/70 underline decoration-dotted">{classLabel}</span>
            </TooltipTrigger>
            <TooltipContent>{p.classNames.join(", ")}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-sm text-black/70">{classLabel}</span>
        )}
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex flex-wrap items-center gap-1">
          {p.is_active ? (
            <StatusBadge tone="green">Active</StatusBadge>
          ) : (
            <StatusBadge tone="gray">Inactive</StatusBadge>
          )}
          {p.is_featured && <StatusBadge tone="orange">Featured</StatusBadge>}
          {p.is_deal && <StatusBadge tone="purple">Deal</StatusBadge>}
          {p.is_out_of_stock && <StatusBadge tone="red">Out of Stock</StatusBadge>}
        </div>
      </td>
      <td className="px-3 py-3 align-middle text-right hidden md:table-cell">
        <span className="inline-flex items-center gap-1 text-sm font-medium text-black tabular-nums">
          <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
          {p.rating.toFixed(1)}
        </span>
      </td>
    </tr>
  );
}

function CollectionBadge({ type }: { type: "boys" | "girls" }) {
  const boys = type === "boys";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        boys ? "bg-[#2563EB]/10 text-[#2563EB]" : "bg-[#DB2777]/10 text-[#DB2777]",
      ].join(" ")}
    >
      {boys ? "Boys" : "Girls"}
    </span>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "green" | "gray" | "orange" | "red" | "purple";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    green: "bg-[#22C55E]/10 text-[#15803D]",
    gray: "bg-black/5 text-black/55",
    orange: "bg-[#DC5F00]/10 text-[#DC5F00]",
    red: "bg-[#CF0A0A]/10 text-[#CF0A0A]",
    purple: "bg-[#7C3AED]/10 text-[#7C3AED]",
  };
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        map[tone],
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          tone === "green"
            ? "bg-[#22C55E]"
            : tone === "gray"
              ? "bg-black/30"
              : tone === "orange"
                ? "bg-[#DC5F00]"
                : tone === "red"
                  ? "bg-[#CF0A0A]"
                  : "bg-[#7C3AED]",
        ].join(" ")}
      />
      {children}
    </span>
  );
}

function ProductDetailsDrawer({
  productId,
  collegeName,
  onClose,
}: {
  productId: string | null;
  collegeName: string;
  onClose: () => void;
}) {
  const getFn = useServerFn(getProduct);
  const q = useQuery<ProductDetail | null>({
    queryKey: ["product", productId],
    queryFn: () => getFn({ data: { id: productId! } }),
    enabled: !!productId,
  });

  const p = q.data;
  const collLabel = p?.collection_type === "boys" ? "Boys" : "Girls";
  const customerName = p ? `${collegeName} ${collLabel} ${p.name}` : "";

  return (
    <Sheet open={!!productId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
        <SheetHeader className="px-6 py-4 border-b border-[#E5E7EB] sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg">Product Details</SheetTitle>
            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-black/[0.06] text-[10px] font-semibold tracking-wider text-black/60 uppercase">
              <Lock className="h-2.5 w-2.5" />
              Read Only
            </span>
          </div>
          <SheetDescription>View-only preview of this product.</SheetDescription>
        </SheetHeader>

        {q.isLoading || !p ? (
          <div className="p-8 text-sm text-black/50">Loading…</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Images */}
            {p.images.length > 0 && (
              <div>
                <SectionLabel>Images</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                  {p.images.map((img) => (
                    <div
                      key={img.id}
                      className="relative aspect-[4/5] rounded-lg overflow-hidden bg-[#F5F5F5]"
                    >
                      {img.imageUrl ? (
                        <img src={img.imageUrl} alt="" className="max-h-full max-w-full object-contain p-1.5" />
                      ) : (
                        <div className="h-full w-full grid place-items-center">
                          <PackageOpen className="h-5 w-5 text-black/25" />
                        </div>
                      )}
                      {img.is_primary && (
                        <span className="absolute top-1 left-1 rounded-md bg-black/70 text-white text-[10px] font-semibold px-1.5 py-0.5">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Basic */}
            <div>
              <SectionLabel>Product</SectionLabel>
              <h3 className="text-xl font-bold text-black">{p.name}</h3>
              <p className="text-sm text-[#6B7280] mt-1">{customerName}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <CollectionBadge type={p.collection_type} />
                {p.is_active ? (
                  <StatusBadge tone="green">Active</StatusBadge>
                ) : (
                  <StatusBadge tone="gray">Inactive</StatusBadge>
                )}
                {p.is_featured && <StatusBadge tone="orange">Featured</StatusBadge>}
                {p.is_deal && <StatusBadge tone="purple">Deal</StatusBadge>}
                {p.is_out_of_stock && <StatusBadge tone="red">Out of Stock</StatusBadge>}
                <span className="inline-flex items-center gap-1 text-sm font-medium text-black tabular-nums ml-auto">
                  <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                  {p.rating.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Sizes & Prices */}
            <div>
              <SectionLabel>Sizes & Prices</SectionLabel>
              <div className="rounded-xl border border-[#E5E7EB] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#F8F9FB] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    <tr>
                      <th className="px-3 py-2 text-left">Size</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Sale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.sizes.map((s) => (
                      <tr key={s.id} className="border-t border-[#F1F2F4]">
                        <td className="px-3 py-2">{s.size}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatPrice(s.price)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-[#CF0A0A]">
                          {s.sale_price != null ? formatPrice(s.sale_price) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Classes per size */}
            {p.class_mappings.some((m) => m.class_ids.length > 0) && (
              <div>
                <SectionLabel>Classes</SectionLabel>
                <div className="space-y-2">
                  {p.class_mappings.map((m) => (
                    <div key={m.size} className="text-sm">
                      <span className="font-medium text-black">{m.size}:</span>{" "}
                      <span className="text-black/60">
                        {m.class_ids.length ? `${m.class_ids.length} class(es)` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campuses */}
            <div>
              <SectionLabel>Campuses</SectionLabel>
              <p className="text-sm text-black/70">
                {p.campus_ids.length === 0
                  ? "All Campuses"
                  : `${p.campus_ids.length} campus(es) assigned`}
              </p>
            </div>

            {/* Quality Tags */}
            {p.quality_tags.length > 0 && (
              <div>
                <SectionLabel>Quality Tags</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {p.quality_tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-md bg-[#F3F4F6] text-black/70 text-[11px] font-semibold px-2 py-0.5"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Colours */}
            {p.colours.length > 0 && (
              <div>
                <SectionLabel>Colours</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {p.colours.map((c) => (
                    <div
                      key={c.id}
                      className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] px-2 py-1"
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: c.hex_code }}
                      />
                      <span className="text-xs text-black/70">{c.colour_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {p.description && (
              <div>
                <SectionLabel>Description</SectionLabel>
                <div
                  className="prose prose-sm max-w-none text-black/70"
                  dangerouslySetInnerHTML={{ __html: p.description }}
                />
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.18em] text-[#6B7280] font-semibold mb-2 flex items-center gap-1.5">
      <Layers className="h-3 w-3" />
      {children}
    </p>
  );
}
