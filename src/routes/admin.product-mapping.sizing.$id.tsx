import { useState } from "react";
import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import { SizingDialog } from "@/components/admin/SizingDialog";
import {
  deleteSizing,
  getSizing,
  listMeasurementUnits,
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

export const Route = createFileRoute("/admin/product-mapping/sizing/$id")({
  loader: async ({ params, context }) => {
    const sizing = await context.queryClient.fetchQuery({
      queryKey: ["sizing", params.id],
      queryFn: () => getSizing({ data: { id: params.id } }),
    });
    if (!sizing) throw notFound();
    const units = await context.queryClient
      .fetchQuery({
        queryKey: ["sizing-units"],
        queryFn: () => listMeasurementUnits(),
      })
      .catch(() => [] as string[]);
    return { sizing, units };
  },
  component: SizingDetailPage,
  notFoundComponent: () => (
    <div className="text-center py-20">
      <p className="text-lg font-semibold">Size measurement not found</p>
      <Link
        to="/admin/product-mapping/sizing"
        className="mt-4 inline-block text-sm text-[#CF0A0A]"
      >
        ← Back to Sizing
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="text-center py-20">
      <p className="text-sm text-[#CF0A0A]">{error.message}</p>
    </div>
  ),
});

function SizingDetailPage() {
  const { sizing, units } = Route.useLoaderData() as {
    sizing: import("@/lib/sizing.functions").SizingDetail;
    units: string[];
  };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const del = useServerFn(deleteSizing);

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteMut = useMutation({
    mutationFn: async () => del({ data: { id: sizing.id } }),
    onSuccess: () => {
      toast.success("Size measurement deleted");
      qc.invalidateQueries({ queryKey: ["sizings"] });
      navigate({ to: "/admin/product-mapping/sizing" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="mb-6">
        <Link
          to="/admin/product-mapping/sizing"
          className="inline-flex items-center gap-1.5 text-sm text-black/60 hover:text-[#CF0A0A] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sizing
        </Link>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between mb-8 pb-6 border-b border-[#E5E7EB]">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-black tracking-tight">
            {sizing.size_label}
          </h2>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
            <div>
              <span className="text-black/50">Size : </span>
              <span className="font-semibold text-black">{sizing.size}</span>
            </div>
            <div>
              <span className="text-black/50">Measurement Unit : </span>
              <span className="font-semibold text-black">
                {sizing.measurement_unit}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] hover:bg-black/[0.04] text-sm font-medium text-black px-3.5 py-2 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#CF0A0A] hover:bg-[#DC5F00] text-white text-sm font-medium px-3.5 py-2 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden bg-white max-w-2xl">
        <table className="w-full text-sm">
          <thead className="bg-[#F9FAFB] text-black/55 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left font-semibold px-5 py-3">Measurement</th>
              <th className="text-right font-semibold px-5 py-3">
                Value ({sizing.measurement_unit})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F1F1]">
            {sizing.measurements.map((m) => (
              <tr key={m.id} className="hover:bg-[#FAFAFA] transition-colors">
                <td className="px-5 py-3 font-medium text-black">
                  {m.measurement_label}
                </td>
                <td className="px-5 py-3 text-right text-black/80 tabular-nums">
                  {m.measurement_value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SizingDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        sizing={sizing}
        unitSuggestions={units}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
              onClick={() => deleteMut.mutate()}
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
