import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Truck, CheckCircle2, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  activateDeliveryCharge,
  createDeliveryCharge,
  deleteDeliveryCharge,
  listDeliveryCharges,
  updateDeliveryCharge,
  type DeliveryChargeRow,
} from "@/lib/delivery-charges.functions";

export const Route = createFileRoute("/admin/product-mapping/delivery-charges")({
  component: DeliveryChargesPage,
});

function formatDate(d: string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeliveryChargesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listDeliveryCharges);
  const create = useServerFn(createDeliveryCharge);
  const update = useServerFn(updateDeliveryCharge);
  const activate = useServerFn(activateDeliveryCharge);
  const del = useServerFn(deleteDeliveryCharge);

  const rowsQ = useQuery<DeliveryChargeRow[]>({
    queryKey: ["delivery-charges"],
    queryFn: () => list(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryChargeRow | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const activateMut = useMutation({
    mutationFn: (id: string) => activate({ data: { id } }),
    onSuccess: () => {
      toast.success("Delivery charge activated");
      qc.invalidateQueries({ queryKey: ["delivery-charges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["delivery-charges"] });
      setConfirmId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = rowsQ.data ?? [];
  const active = rows.find((r) => r.is_active) ?? null;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8 pb-6 border-b border-[#E5E7EB]">
        <div>
          <div className="text-xs font-medium text-black/50 mb-1">
            <Link to="/admin/product-mapping" className="hover:text-[#CF0A0A] transition-colors">
              Product Mapping
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-black/70">Delivery Charges</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-black tracking-tight">
            Delivery Charges
          </h2>
          <p className="mt-2 text-[15px] text-black/55 max-w-2xl">
            Manage the delivery charge and instructions shown to customers at checkout. Only one
            record can be active at a time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#CF0A0A] hover:bg-[#a80808] text-white text-sm font-medium px-4 py-2.5 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Delivery Charge
        </button>
      </div>

      {/* Active card */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#CF0A0A]/8 text-[#CF0A0A]">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-black">Currently Active</h3>
            <p className="text-xs text-black/55">This charge is applied on every checkout.</p>
          </div>
        </div>
        {active ? (
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="rounded-xl bg-[#F9FAFB] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-semibold">
                Delivery Charge
              </p>
              <p className="text-3xl font-bold text-black mt-1">
                Rs {active.delivery_charge.toLocaleString()}
              </p>
              <p className="text-[11px] text-black/50 mt-2">
                Since {formatDate(active.updated_at)}
              </p>
            </div>
            <div className="rounded-xl bg-[#F9FAFB] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-semibold">
                Delivery Instruction
              </p>
              <p className="text-sm text-black/80 mt-2 whitespace-pre-line">
                {active.instruction || <span className="text-black/40">No instruction set.</span>}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-black/55">
            No active delivery charge. Checkout will show <b>Rs 0</b> until you set one.
          </p>
        )}
      </div>

      {/* History */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-[#F1F1F1] text-xs uppercase tracking-wider text-black/55 font-semibold">
          All Records
        </div>
        {rowsQ.isLoading ? (
          <div className="p-8 text-sm text-black/50">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-black/55">
            No delivery charges yet. Add one to enable checkout delivery pricing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] text-black/55 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-semibold px-5 py-3">Status</th>
                  <th className="text-left font-semibold px-5 py-3">Charge</th>
                  <th className="text-left font-semibold px-5 py-3">Instruction</th>
                  <th className="text-left font-semibold px-5 py-3">Last Updated</th>
                  <th className="text-right font-semibold px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F1F1]">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-4">
                      {r.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-black/[0.05] text-black/60 text-xs font-medium px-2.5 py-1">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-semibold text-black">
                      Rs {r.delivery_charge.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-black/70 max-w-md">
                      <div className="line-clamp-2">{r.instruction || <span className="text-black/40">—</span>}</div>
                    </td>
                    <td className="px-5 py-4 text-black/60">{formatDate(r.updated_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {!r.is_active && (
                          <button
                            type="button"
                            onClick={() => activateMut.mutate(r.id)}
                            disabled={activateMut.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Activate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(r);
                            setDialogOpen(true);
                          }}
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
        )}
      </div>

      <DeliveryChargeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["delivery-charges"] });
          setDialogOpen(false);
        }}
        create={create}
        update={update}
      />

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Charge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? Existing orders keep their snapshot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmId && deleteMut.mutate(confirmId)}
              className="rounded-lg bg-[#CF0A0A] hover:bg-[#a80808] text-white"
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DeliveryChargeDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
  create,
  update,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: DeliveryChargeRow | null;
  onSaved: () => void;
  create: ReturnType<typeof useServerFn<typeof createDeliveryCharge>>;
  update: ReturnType<typeof useServerFn<typeof updateDeliveryCharge>>;
}) {
  const [charge, setCharge] = useState<string>("");
  const [instruction, setInstruction] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open) {
      setCharge(editing ? String(editing.delivery_charge) : "");
      setInstruction(editing?.instruction ?? "");
      setIsActive(editing ? editing.is_active : true);
    }
  }, [open, editing]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const value = Number(charge);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error("Delivery charge must be a number greater than or equal to 0.");
      }
      const payload = {
        delivery_charge: value,
        instruction: instruction.trim() || null,
        is_active: isActive,
      };
      if (editing) {
        return update({ data: { id: editing.id, ...payload } });
      }
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Delivery charge updated" : "Delivery charge saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Delivery Charge" : "Add Delivery Charge"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60 mb-1.5">
              Delivery Charges (Rs) *
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={charge}
              onChange={(e) => setCharge(e.target.value)}
              placeholder="e.g. 250"
              className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm focus:border-[#CF0A0A] outline-none"
            />
            <p className="text-[11px] text-black/50 mt-1">
              Only numeric values. Must be ≥ 0.
            </p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60 mb-1.5">
              Delivery Instruction (optional)
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="e.g. Delivery may take 3–5 business days. Please keep your phone available for courier confirmation."
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#CF0A0A] outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-black/80">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-[#CF0A0A]"
            />
            Set as active (previous active record will be deactivated)
          </label>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-black/70 hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#CF0A0A] hover:bg-[#a80808] text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-60"
          >
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Update" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
