import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Eye, Pencil, Trash2, Ruler } from "lucide-react";

import { PageHeader } from "@/components/admin/PageHeader";
import { SizingDialog } from "@/components/admin/SizingDialog";
import {
  deleteSizing,
  getSizing,
  listMeasurementUnits,
  listSizings,
  type SizingDetail,
  type SizingRow,
} from "@/lib/sizing.functions";
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

export const Route = createFileRoute("/admin/product-mapping/sizing/")({
  component: SizingListPage,
});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SizingListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listSizings);
  const units = useServerFn(listMeasurementUnits);
  const load = useServerFn(getSizing);
  const del = useServerFn(deleteSizing);

  const rowsQ = useQuery<SizingRow[]>({
    queryKey: ["sizings"],
    queryFn: () => list(),
  });
  const unitsQ = useQuery<string[]>({
    queryKey: ["sizing-units"],
    queryFn: () => units(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SizingDetail | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      const detail = await load({ data: { id } });
      if (!detail) {
        toast.error("Size record not found");
        return;
      }
      setEditing(detail);
      setDialogOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Size measurement deleted");
      qc.invalidateQueries({ queryKey: ["sizings"] });
      setConfirmId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = rowsQ.data ?? [];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8 pb-6 border-b border-[#E5E7EB]">
        <div>
          <div className="text-xs font-medium text-black/50 mb-1">
            <Link
              to="/admin/product-mapping"
              className="hover:text-[#CF0A0A] transition-colors"
            >
              Product Mapping
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-black/70">Sizing</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-black tracking-tight">
            Sizing
          </h2>
          <p className="mt-2 text-[15px] text-black/55 max-w-2xl">
            Reusable garment size templates with unlimited custom measurements.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-[#CF0A0A] hover:bg-[#DC5F00] text-white text-sm font-medium px-4 py-2.5 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Size Measurement
        </button>
      </div>

      {rowsQ.isLoading ? (
        <div className="text-sm text-black/50">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#CF0A0A]/8 text-[#CF0A0A]">
            <Ruler className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-black">
            No size measurements yet
          </h3>
          <p className="mt-1.5 text-sm text-black/55 max-w-sm mx-auto">
            Create your first sizing template to start building the measurement library.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#CF0A0A] hover:bg-[#DC5F00] text-white text-sm font-medium px-4 py-2.5 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Size Measurement
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] text-black/55 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-semibold px-5 py-3">Size Label</th>
                  <th className="text-left font-semibold px-5 py-3">Size</th>
                  <th className="text-left font-semibold px-5 py-3">Unit</th>
                  <th className="text-left font-semibold px-5 py-3">
                    Measurements
                  </th>
                  <th className="text-left font-semibold px-5 py-3">Created</th>
                  <th className="text-right font-semibold px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F1F1]">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-4 font-medium text-black">
                      {r.size_label}
                    </td>
                    <td className="px-5 py-4 text-black/70">{r.size}</td>
                    <td className="px-5 py-4 text-black/70">
                      {r.measurement_unit}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-black/[0.04] text-black/70 text-xs font-medium px-2.5 py-1">
                        {r.measurement_count}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-black/60">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            navigate({
                              to: "/admin/product-mapping/sizing/$id",
                              params: { id: r.id },
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-black/70 hover:bg-black/[0.05] hover:text-black transition-colors"
                          aria-label="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(r.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-black/70 hover:bg-black/[0.05] hover:text-black transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(r.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#CF0A0A] hover:bg-[#CF0A0A]/[0.06] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SizingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sizing={editing}
        unitSuggestions={unitsQ.data ?? []}
      />

      <AlertDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Size Measurement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this size? All associated
              measurements will also be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmId && deleteMut.mutate(confirmId)}
              className="rounded-lg bg-[#CF0A0A] hover:bg-[#DC5F00] text-white"
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
