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
  MoreHorizontal,
  Search,
  Download,
  Copy,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { getCategory, getSchool, listCampuses, listClasses } from "@/lib/school-uniform.functions";
import {
  deleteProduct,
  getProduct,
  listProducts,
  type ProductDetail,
  type ProductRow,
} from "@/lib/product.functions";
import { getProductsExport } from "@/lib/product-export.functions";
import { downloadProductsExport } from "@/lib/product-export";
import { ProductDialog } from "@/components/admin/ProductDialog";

export const Route = createFileRoute("/admin/school-uniform/$slug/$collection/$categoryId")({
  loader: async ({ params }) => {
    const [category, school] = await Promise.all([
      getCategory({ data: { id: params.categoryId } }),
      getSchool({ data: { slug: params.slug } }),
    ]);
    if (!category || !school) throw notFound();
    return { category, school };
  },
  component: CategoryDetail,
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

function CategoryDetail() {
  const { category, school } = Route.useLoaderData();
  const { slug, collection, categoryId } = Route.useParams();
  const coll = collection as "boys" | "girls";
  const collLabel = coll === "boys" ? "Boys" : "Girls";
  const qc = useQueryClient();

  const listFn = useServerFn(listProducts);
  const campusFn = useServerFn(listCampuses);
  const classesFn = useServerFn(listClasses);
  const getFn = useServerFn(getProduct);
  const delFn = useServerFn(deleteProduct);
  const exportFn = useServerFn(getProductsExport);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const payload = await exportFn({
        data: { schoolId: category.school_id, categoryId },
      });
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

  const productsQ = useQuery<ProductRow[]>({
    queryKey: ["products", categoryId],
    queryFn: () => listFn({ data: { categoryId } }),
  });
  const campusesQ = useQuery({
    queryKey: ["campuses", category.school_id],
    queryFn: () => campusFn({ data: { schoolId: category.school_id } }),
  });
  const classesQ = useQuery({
    queryKey: ["classes", category.school_id],
    queryFn: () => classesFn({ data: { schoolId: category.school_id } }),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDetail | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive" | "out" | "featured" | "deal">(
    "all",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

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
      qc.invalidateQueries({ queryKey: ["products", categoryId] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["school-products"] });
      setConfirmId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allRows = productsQ.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
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

  const pageIds = pageRows.map((p) => p.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = pageIds.some((id) => selected.has(id));
  const toggleAll = (v: boolean) => {
    const next = new Set(selected);
    if (v) pageIds.forEach((id) => next.add(id));
    else pageIds.forEach((id) => next.delete(id));
    setSelected(next);
  };
  const toggleOne = (id: string, v: boolean) => {
    const next = new Set(selected);
    if (v) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const campusCount = campusesQ.data?.length ?? 0;

  return (
    <div>
      <Link
        to="/admin/school-uniform/$slug/$collection"
        params={{ slug, collection: coll }}
        className="inline-flex items-center gap-1.5 text-sm text-black/60 hover:text-black mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {collLabel} Collection
      </Link>

      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7280]">
            {collLabel} · {category.name}
          </p>
          <h2 className="mt-1 text-[26px] md:text-[30px] font-bold text-black tracking-tight truncate">
            Products
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Manage all products inside this category.
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-[#CF0A0A] hover:bg-[#DC5F00] text-white rounded-xl shrink-0 h-10 px-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Toolbar */}
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
            setStatus(v as typeof status);
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

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="rounded-xl border border-[#CF0A0A]/20 bg-[#CF0A0A]/[0.04] px-4 py-2.5 mb-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-black">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-[#E5E7EB]"
              onClick={() => toast.info("Export selected — coming soon")}
            >
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-[#E5E7EB]"
              onClick={() => toast.info("Deactivate selected — coming soon")}
            >
              Deactivate
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-lg bg-[#CF0A0A] hover:bg-[#DC5F00] text-white"
              onClick={() => toast.info("Bulk delete — coming soon")}
            >
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
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
          <p className="text-xs text-[#6B7280] mt-1">Try clearing the search or changing status.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F9FB] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] sticky top-0 z-10">
                <tr className="border-b border-[#E5E7EB]">
                  <th className="w-10 px-4 py-3 text-left">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => toggleAll(!!v)}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="w-[76px] px-2 py-3 text-left">Image</th>
                  <th className="px-3 py-3 text-left">Product Name</th>
                  <th className="px-3 py-3 text-left hidden md:table-cell">Sizes</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3 text-right hidden lg:table-cell">Sale Price</th>
                  <th className="px-3 py-3 text-left hidden lg:table-cell">Campus</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="w-12 px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((p) => (
                  <ProductTableRow
                    key={p.id}
                    p={p}
                    schoolName={school.name}
                    collLabel={collLabel}
                    categoryName={category.name}
                    campusCount={campusCount}
                    selected={selected.has(p.id)}
                    onSelect={(v) => toggleOne(p.id, v)}
                    onEdit={() => openEdit(p.id)}
                    onDelete={() => setConfirmId(p.id)}
                    onDuplicate={() => toast.info("Duplicate — coming soon")}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
              {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
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

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolId={category.school_id}
        schoolName={school.name}
        categoryId={categoryId}
        categoryName={category.name}
        collectionType={coll}
        campuses={campusesQ.data ?? []}
        classes={classesQ.data ?? []}
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
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmId && delMut.mutate(confirmId)}
              className="rounded-lg bg-[#CF0A0A] hover:bg-[#DC5F00] text-white"
            >
              {delMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductTableRow({
  p,
  schoolName,
  collLabel,
  categoryName,
  campusCount,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  p: ProductRow;
  schoolName: string;
  collLabel: string;
  categoryName: string;
  campusCount: number;
  selected: boolean;
  onSelect: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const customerPreview = `${schoolName} ${collLabel} ${p.name} ${categoryName}`.trim();
  const priceLabel = p.priceFrom == null
    ? "—"
    : p.sizeCount > 1
      ? `From ${formatPrice(p.priceFrom)}`
      : formatPrice(p.priceFrom);

  return (
    <tr
      className={[
        "border-b border-[#F1F2F4] last:border-b-0 transition-colors cursor-pointer",
        selected ? "bg-[#CF0A0A]/[0.03]" : "hover:bg-[#F8F9FB]",
      ].join(" ")}
    >
      <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelect(!!v)}
          aria-label={`Select ${p.name}`}
        />
      </td>
      <td className="px-2 py-3 align-middle">
        <div className="h-[60px] w-[60px] rounded-lg bg-[#F5F5F5] overflow-hidden grid place-items-center">
          {p.primaryImageUrl ? (
            <img
              src={p.primaryImageUrl}
              alt={p.name}
              className="max-h-full max-w-full object-contain p-1.5"
              style={{ objectPosition: "center" }}
            />
          ) : (
            <PackageOpen className="h-5 w-5 text-black/25" />
          )}
        </div>
      </td>
      <td className="px-3 py-3 align-middle max-w-[280px]">
        <p className="text-sm font-semibold text-black truncate">{p.name}</p>
        <p className="text-[12px] text-[#6B7280] truncate mt-0.5">{customerPreview}</p>
      </td>
      <td className="px-3 py-3 align-middle hidden md:table-cell">
        {p.sizeCount > 0 ? (
          <span className="inline-flex items-center rounded-md bg-[#F3F4F6] text-black/70 text-[11px] font-medium px-2 py-0.5">
            {p.sizeCount} {p.sizeCount === 1 ? "size" : "sizes"}
          </span>
        ) : (
          <span className="text-[#9CA3AF] text-sm">—</span>
        )}
      </td>
      <td className="px-3 py-3 align-middle text-right">
        <span className="text-sm font-semibold text-black tabular-nums whitespace-nowrap">
          {priceLabel}
        </span>
      </td>
      <td className="px-3 py-3 align-middle text-right hidden lg:table-cell">
        <span className="text-sm text-[#9CA3AF] tabular-nums">—</span>
      </td>
      <td className="px-3 py-3 align-middle hidden lg:table-cell">
        <span className="text-sm text-black/70">
          {campusCount > 0 ? `${campusCount} ${campusCount === 1 ? "Campus" : "Campuses"}` : "—"}
        </span>
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
      <td className="px-3 py-3 align-middle text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-black/60 hover:bg-black/[0.06] hover:text-black transition-colors"
              aria-label="Actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Eye className="h-3.5 w-3.5 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-[#CF0A0A] focus:text-[#CF0A0A] focus:bg-[#CF0A0A]/[0.06]"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
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
