import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Download,
  PackageOpen,
  Plus,
  Search,
  Star,
  Pencil,
  Trash2,
  ShoppingBag,
  Tag,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
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
import { MedicalProductDialog } from "@/components/admin/MedicalProductDialog";
import {
  listMedicalProducts,
  getMedicalProduct,
  deleteMedicalProduct,
  type MedicalProductRow,
  type MedicalProductDetail,
} from "@/lib/medical-product.functions";
import { getMedicalProductsExport } from "@/lib/medical-product-export.functions";
import { downloadMedicalProductsExport } from "@/lib/medical-product-export";

export const Route = createFileRoute("/admin/medical")({
  component: MedicalDashboard,
});

type StatusFilter = "all" | "active" | "inactive" | "featured" | "deal" | "out";

function formatPrice(n: number | null) {
  if (n == null) return "—";
  return `Rs. ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
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

function MedicalDashboard() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMedicalProducts);
  const getFn = useServerFn(getMedicalProduct);
  const exportFn = useServerFn(getMedicalProductsExport);
  const deleteFn = useServerFn(deleteMedicalProduct);

  const dataQ = useQuery({
    queryKey: ["medical-products"],
    queryFn: () => listFn(),
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MedicalProductDetail | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const rows = dataQ.data ?? [];

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((r) => r.is_active).length,
      featured: rows.filter((r) => r.is_featured).length,
      deals: rows.filter((r) => r.is_deal).length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
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
  }, [rows, search, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = async (id: string) => {
    try {
      const p = await getFn({ data: { id } });
      if (!p) throw new Error("Product not found");
      setEditing(p);
      setDialogOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["medical-products"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const payload = await exportFn();
      if (!payload.rows.length) {
        toast.info("No products to export");
        return;
      }
      await downloadMedicalProductsExport(payload);
      toast.success("Export ready");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7280]">Module</p>
          <h2 className="mt-1 text-[26px] md:text-[30px] font-bold text-black tracking-tight">
            Medical Products
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Independent catalog for medical uniforms and accessories.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            className="h-9 rounded-lg border-[#E5E7EB] text-black/70"
            onClick={handleExport}
            disabled={exporting || dataQ.isLoading || rows.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting…" : "Export"}
          </Button>
          <Button
            onClick={handleAdd}
            className="h-9 rounded-lg bg-[#CF0A0A] hover:bg-[#DC5F00] text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard icon={<ShoppingBag className="h-4 w-4" />} label="Total Products" value={stats.total} tone="black" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Active" value={stats.active} tone="green" />
        <StatCard icon={<Tag className="h-4 w-4" />} label="Featured" value={stats.featured} tone="orange" />
        <StatCard icon={<Flame className="h-4 w-4" />} label="Deals" value={stats.deals} tone="purple" />
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
            placeholder="Search product..."
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
      </div>

      {/* Table */}
      {dataQ.isLoading ? (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-sm text-black/50">
          Loading products…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-white">
          <PackageOpen className="mx-auto h-10 w-10 text-black/25" />
          <p className="mt-3 text-lg font-semibold text-black">No Medical Products Yet</p>
          <p className="text-sm text-[#6B7280] mt-1">Click "Add Product" to create the first one.</p>
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
                  <th className="px-3 py-3 text-left">Product Name</th>
                  <th className="px-3 py-3 text-right hidden md:table-cell">Rating</th>
                  <th className="px-3 py-3 text-left hidden lg:table-cell">Gender</th>
                  <th className="px-3 py-3 text-left hidden xl:table-cell">Sizes</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left hidden lg:table-cell">Last Updated</th>
                  <th className="px-3 py-3 text-right w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <MedicalRow
                    key={p.id}
                    p={p}
                    onEdit={() => handleEdit(p.id)}
                    onDelete={() => setDeleteId(p.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
            <span>
              Showing <span className="font-medium text-black">{paged.length}</span> of{" "}
              <span className="font-medium text-black">{filtered.length}</span> products
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-md"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </Button>
                <span>
                  Page <span className="font-medium text-black">{currentPage}</span> / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-md"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage === pageCount}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <MedicalProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the product and all its images, sizes and tags.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && delMut.mutate(deleteId)}
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

function MedicalRow({
  p,
  onEdit,
  onDelete,
}: {
  p: MedicalProductRow;
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
            <img src={p.primaryImageUrl} alt={p.name} className="max-h-full max-w-full object-contain p-1.5" />
          ) : (
            <PackageOpen className="h-5 w-5 text-black/25" />
          )}
        </div>
      </td>
      <td className="px-3 py-3 align-middle max-w-[280px]">
        <p className="text-sm font-semibold text-black truncate">{p.name}</p>
      </td>
      <td className="px-3 py-3 align-middle text-right hidden md:table-cell">
        <span className="inline-flex items-center gap-1 text-sm font-medium text-black tabular-nums">
          <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
          {p.rating.toFixed(1)}
        </span>
      </td>
      <td className="px-3 py-3 align-middle hidden lg:table-cell">
        {p.genders.length ? (
          <div className="flex flex-wrap gap-1 max-w-[180px]">
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
