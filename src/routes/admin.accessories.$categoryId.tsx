import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  PackageOpen,
  Pencil,
  Trash2,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Star,
  ShoppingBag,
  Tag,
  Flame,
  CheckCircle2,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AccessoriesProductDialog } from "@/components/admin/AccessoriesProductDialog";
import { getAccessoriesCategory } from "@/lib/accessories.functions";
import {
  deleteAccessoriesProduct,
  getAccessoriesProduct,
  listAccessoriesProducts,
  type AccessoriesProductDetail,
  type AccessoriesProductRow,
} from "@/lib/accessories-product.functions";
import { getAccessoriesProductsExport } from "@/lib/accessories-product-export.functions";
import { downloadAccessoriesProductsExport } from "@/lib/accessories-product-export";

export const Route = createFileRoute("/admin/accessories/$categoryId")({
  loader: async ({ params }) => {
    const category = await getAccessoriesCategory({ data: { id: params.categoryId } });
    if (!category) throw notFound();
    return { category };
  },
  component: AccessoriesCategoryDetail,
  notFoundComponent: () => (
    <div className="text-center py-20 text-sm text-black/50">Category not found</div>
  ),
  errorComponent: ({ error }) => (
    <div className="text-center py-20 text-sm text-[#CF0A0A]">{error.message}</div>
  ),
});

function formatPrice(n: number | null) {
  if (n == null) return "—";
  return `Rs ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type StatusFilter = "all" | "active" | "inactive" | "out" | "featured" | "deal";

function AccessoriesCategoryDetail() {
  const { category } = Route.useLoaderData();
  const { categoryId } = Route.useParams();
  const qc = useQueryClient();

  const listFn = useServerFn(listAccessoriesProducts);
  const getFn = useServerFn(getAccessoriesProduct);
  const delFn = useServerFn(deleteAccessoriesProduct);
  const exportFn = useServerFn(getAccessoriesProductsExport);

  const productsQ = useQuery<AccessoriesProductRow[]>({
    queryKey: ["accessories-products", categoryId],
    queryFn: () => listFn({ data: { categoryId } }),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccessoriesProductDetail | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const allRows = productsQ.data ?? [];

  const stats = useMemo(
    () => ({
      total: allRows.length,
      active: allRows.filter((r) => r.is_active).length,
      featured: allRows.filter((r) => r.is_featured).length,
      deals: allRows.filter((r) => r.is_deal).length,
    }),
    [allRows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((p) => {
      if (q) {
        const hay = `${p.customer_name} ${p.product_name ?? ""} ${p.company_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      switch (status) {
        case "active":
          return p.is_active && !p.is_out_of_stock;
        case "inactive":
          return !p.is_active;
        case "out":
          return p.is_out_of_stock;
        case "featured":
          return p.is_featured;
        case "deal":
          return p.is_deal;
        default:
          return true;
      }
    });
  }, [allRows, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const endIdx = startIdx + pageRows.length;

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = async (id: string) => {
    try {
      const detail = await getFn({ data: { id } });
      if (!detail) return toast.error("Product not found");
      setEditing(detail);
      setDialogOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["accessories-products", categoryId] });
      qc.invalidateQueries({ queryKey: ["accessories-categories"] });
      setConfirmId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const payload = await exportFn({ data: { categoryId } });
      if (!payload.rows.length) {
        toast.info("No products to export");
        return;
      }
      await downloadAccessoriesProductsExport(payload);
      toast.success("Export ready");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <Link
        to="/admin/accessories"
        className="inline-flex items-center gap-1.5 text-sm text-black/60 hover:text-black mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Accessories
      </Link>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7280]">Accessories</p>
          <h2 className="mt-1 text-[26px] md:text-[30px] font-bold text-black tracking-tight truncate">
            {category.name}
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">Manage all products inside this category.</p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-[#CF0A0A] hover:bg-[#DC5F00] text-white rounded-xl shrink-0 h-10 px-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard icon={<ShoppingBag className="h-4 w-4" />} label="Total" value={stats.total} tone="black" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Active" value={stats.active} tone="green" />
        <StatCard icon={<Tag className="h-4 w-4" />} label="Featured" value={stats.featured} tone="orange" />
        <StatCard icon={<Flame className="h-4 w-4" />} label="Deals" value={stats.deals} tone="purple" />
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products..."
            className="pl-9 h-9 rounded-lg border-[#E5E7EB] bg-[#F8F9FB]"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as StatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[160px] rounded-lg border-[#E5E7EB] bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="deal">Deals</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="h-9 rounded-lg border-[#E5E7EB] text-black/70"
          onClick={handleExport}
          disabled={exporting || productsQ.isLoading || allRows.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "Exporting…" : "Export"}
        </Button>
      </div>

      {productsQ.isLoading ? (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-sm text-black/50">
          Loading products…
        </div>
      ) : allRows.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-white">
          <PackageOpen className="mx-auto h-10 w-10 text-black/25" />
          <p className="mt-3 text-lg font-semibold text-black">No Products Yet</p>
          <p className="text-sm text-[#6B7280] mt-1">
            Click "Add Product" to create your first product.
          </p>
          <Button
            onClick={openAdd}
            className="mt-5 bg-[#CF0A0A] hover:bg-[#DC5F00] text-white rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-10 text-center">
          <p className="text-sm font-medium text-black">No products match your filters.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F9FB] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] sticky top-0 z-10">
                <tr className="border-b border-[#E5E7EB]">
                  <th className="w-[76px] px-3 py-3 text-left">Image</th>
                  <th className="px-3 py-3 text-left">Customer Sees</th>
                  <th className="px-3 py-3 text-left hidden lg:table-cell">Product</th>
                  <th className="px-3 py-3 text-left hidden lg:table-cell">Company</th>
                  <th className="px-3 py-3 text-left hidden xl:table-cell">Gender</th>
                  <th className="px-3 py-3 text-left hidden xl:table-cell">Sizes</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3 text-right hidden md:table-cell">Rating</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left hidden lg:table-cell">Updated</th>
                  <th className="w-[120px] px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((p) => (
                  <ProductRow
                    key={p.id}
                    p={p}
                    onEdit={() => openEdit(p.id)}
                    onDelete={() => setConfirmId(p.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#E5E7EB] bg-white">
            <p className="text-xs text-[#6B7280]">
              Showing <span className="font-medium text-black">{startIdx + 1}</span>–
              <span className="font-medium text-black">{endIdx}</span> of{" "}
              <span className="font-medium text-black">{filtered.length}</span> products
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((n) => Math.max(1, n - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-black/70 border border-[#E5E7EB] hover:bg-[#F8F9FB] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              {Array.from({ length: totalPages })
                .slice(0, 5)
                .map((_, i) => {
                  const n = i + 1;
                  const active = n === currentPage;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={[
                        "h-8 min-w-[32px] px-2 rounded-lg text-xs font-medium border transition-colors",
                        active
                          ? "bg-black text-white border-black"
                          : "text-black/70 border-[#E5E7EB] hover:bg-[#F8F9FB]",
                      ].join(" ")}
                    >
                      {n}
                    </button>
                  );
                })}
              <button
                type="button"
                onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-black/70 border border-[#E5E7EB] hover:bg-[#F8F9FB] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <AccessoriesProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categoryId={categoryId}
        categoryName={category.name}
        product={editing}
      />


      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product, its images, sizes, and all related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmId && delMut.mutate(confirmId)}
              className="bg-[#CF0A0A] hover:bg-[#DC5F00]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
  tone: "black" | "green" | "orange" | "purple";
}) {
  const map: Record<string, string> = {
    black: "bg-black/[0.06] text-black",
    green: "bg-[#22C55E]/10 text-[#15803D]",
    orange: "bg-[#DC5F00]/10 text-[#DC5F00]",
    purple: "bg-[#7C3AED]/10 text-[#7C3AED]",
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

function Badge({
  tone,
  children,
}: {
  tone: "green" | "gray" | "orange" | "purple" | "red";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    green: "bg-[#22C55E]/12 text-[#15803D]",
    gray: "bg-black/[0.06] text-black/60",
    orange: "bg-[#DC5F00]/12 text-[#DC5F00]",
    purple: "bg-[#7C3AED]/12 text-[#7C3AED]",
    red: "bg-[#CF0A0A]/12 text-[#CF0A0A]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md text-[11px] font-semibold px-1.5 py-0.5 ${map[tone]}`}
    >
      {children}
    </span>
  );
}

function ProductRow({
  p,
  onEdit,
  onDelete,
}: {
  p: AccessoriesProductRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const priceLabel =
    p.priceFrom == null
      ? "—"
      : p.priceTo != null && p.priceTo !== p.priceFrom
        ? `From ${formatPrice(p.priceFrom)}`
        : formatPrice(p.priceFrom);
  return (
    <tr className="border-b border-[#F1F2F4] last:border-b-0 hover:bg-[#F8F9FB] transition-colors">
      <td className="px-3 py-3 align-middle">
        <div className="h-[60px] w-[60px] rounded-lg bg-[#F5F5F5] overflow-hidden grid place-items-center">
          {p.primaryImageUrl ? (
            <img src={p.primaryImageUrl} alt="" className="max-h-full max-w-full object-contain p-1.5" />
          ) : (
            <PackageOpen className="h-5 w-5 text-black/25" />
          )}
        </div>
      </td>
      <td className="px-3 py-3 align-middle max-w-[280px]">
        <p className="text-sm font-semibold text-black truncate">{p.customer_name}</p>
      </td>
      <td className="px-3 py-3 align-middle hidden lg:table-cell">
        <span className="text-sm text-black/70">{p.product_name || "—"}</span>
      </td>
      <td className="px-3 py-3 align-middle hidden lg:table-cell">
        <span className="text-sm text-black/70">{p.company_name || "—"}</span>
      </td>
      <td className="px-3 py-3 align-middle hidden xl:table-cell">
        {p.genders.length ? (
          <div className="flex flex-wrap gap-1 max-w-[160px]">
            {p.genders.slice(0, 3).map((g) => (
              <span
                key={g}
                className="inline-flex items-center rounded-md bg-black/[0.06] text-black/70 text-[11px] font-medium px-1.5 py-0.5"
              >
                {g}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[#9CA3AF] text-sm">—</span>
        )}
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
      <td className="px-3 py-3 align-middle text-right hidden md:table-cell">
        <span className="inline-flex items-center gap-1 text-sm font-medium text-black tabular-nums">
          <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
          {p.rating.toFixed(1)}
        </span>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex flex-wrap items-center gap-1">
          {p.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Inactive</Badge>}
          {p.is_featured && <Badge tone="orange">Featured</Badge>}
          {p.is_deal && <Badge tone="purple">Deal</Badge>}
          {p.is_out_of_stock && <Badge tone="red">Out of Stock</Badge>}
        </div>
      </td>
      <td className="px-3 py-3 align-middle hidden lg:table-cell">
        <span className="text-xs text-[#6B7280]">{fmtDate(p.updated_at)}</span>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="grid place-items-center h-8 w-8 rounded-lg text-black/60 hover:bg-black/[0.06] hover:text-black transition-colors"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="grid place-items-center h-8 w-8 rounded-lg text-[#CF0A0A] hover:bg-[#CF0A0A]/[0.08] transition-colors"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
