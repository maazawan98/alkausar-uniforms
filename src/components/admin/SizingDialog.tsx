import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  createSizing,
  updateSizing,
  type SizingDetail,
} from "@/lib/sizing.functions";

const UNIT_SUGGESTIONS = ["Inch", "CM", "Meter"];

const LABEL_SUGGESTIONS = [
  "Shoulder",
  "Chest",
  "Sleeves",
  "Length",
  "Collar",
  "Waist",
  "Hip",
  "Bottom",
  "Neck",
  "Arm Hole",
  "Cuff",
  "Pocket Width",
];

type Row = {
  key: string;
  id?: string;
  label: string;
  value: string;
};

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function SortableRow({
  row,
  onChange,
  onRemove,
  canRemove,
}: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.key });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white p-2 pl-1",
        isDragging ? "shadow-lg" : "",
      ].join(" ")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="grid h-8 w-6 shrink-0 place-items-center rounded-md text-black/35 hover:text-black/70 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        list="sizing-label-suggestions"
        placeholder="Measurement label"
        value={row.label}
        onChange={(e) => onChange({ label: e.target.value })}
        className="flex-1 h-9 rounded-lg"
      />
      <Input
        type="number"
        step="0.01"
        inputMode="decimal"
        placeholder="Value"
        value={row.value}
        onChange={(e) => onChange({ value: e.target.value })}
        className="w-28 h-9 rounded-lg text-right"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-black/40 hover:text-[#CF0A0A] hover:bg-[#CF0A0A]/[0.06] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black/40 transition-colors"
        aria-label="Remove measurement"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SizingDialog({
  open,
  onOpenChange,
  sizing,
  unitSuggestions = [],
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sizing?: SizingDetail | null;
  unitSuggestions?: string[];
}) {
  const isEdit = !!sizing;
  const [sizeLabel, setSizeLabel] = useState("");
  const [size, setSize] = useState("");
  const [unit, setUnit] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { key: makeKey(), label: "", value: "" },
  ]);

  useEffect(() => {
    if (!open) return;
    setSizeLabel(sizing?.size_label ?? "");
    setSize(sizing?.size ?? "");
    setUnit(sizing?.measurement_unit ?? "");
    if (sizing && sizing.measurements.length > 0) {
      setRows(
        sizing.measurements.map((m) => ({
          key: makeKey(),
          id: m.id,
          label: m.measurement_label,
          value: String(m.measurement_value),
        })),
      );
    } else {
      setRows([{ key: makeKey(), label: "", value: "" }]);
    }
  }, [open, sizing]);

  const qc = useQueryClient();
  const createFn = useServerFn(createSizing);
  const updateFn = useServerFn(updateSizing);

  const units = useMemo(() => {
    const set = new Set<string>([...UNIT_SUGGESTIONS, ...unitSuggestions]);
    return Array.from(set);
  }, [unitSuggestions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setRows((rs) => {
      const oldIdx = rs.findIndex((r) => r.key === active.id);
      const newIdx = rs.findIndex((r) => r.key === over.id);
      if (oldIdx < 0 || newIdx < 0) return rs;
      return arrayMove(rs, oldIdx, newIdx);
    });
  };

  const patchRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((rs) => [...rs, { key: makeKey(), label: "", value: "" }]);

  const removeRow = (key: string) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));

  const mut = useMutation({
    mutationFn: async () => {
      if (!sizeLabel.trim()) throw new Error("Size Label is required");
      if (!size.trim()) throw new Error("Size is required");
      if (!unit.trim()) throw new Error("Measurement Unit is required");
      if (rows.length === 0) throw new Error("Add at least one measurement");

      const seen = new Set<string>();
      const measurements = rows.map((r, i) => {
        const label = r.label.trim();
        if (!label)
          throw new Error(`Row ${i + 1}: measurement label is required`);
        const key = label.toLowerCase();
        if (seen.has(key))
          throw new Error(`Row ${i + 1}: "${label}" is duplicated`);
        seen.add(key);
        if (r.value.trim() === "")
          throw new Error(`Row ${i + 1}: value is required`);
        const num = Number(r.value);
        if (!Number.isFinite(num))
          throw new Error(`Row ${i + 1}: value must be numeric`);
        return {
          id: r.id,
          measurement_label: label,
          measurement_value: num,
        };
      });

      if (isEdit && sizing) {
        await updateFn({
          data: {
            id: sizing.id,
            size_label: sizeLabel.trim(),
            size: size.trim(),
            measurement_unit: unit.trim(),
            measurements,
          },
        });
      } else {
        await createFn({
          data: {
            size_label: sizeLabel.trim(),
            size: size.trim(),
            measurement_unit: unit.trim(),
            measurements,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Size measurement updated" : "Size measurement saved");
      qc.invalidateQueries({ queryKey: ["sizings"] });
      if (isEdit && sizing) {
        qc.invalidateQueries({ queryKey: ["sizing", sizing.id] });
      }
      qc.invalidateQueries({ queryKey: ["sizing-units"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-[#E5E7EB]">
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Edit Size Measurement" : "Add Size Measurement"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <datalist id="sizing-unit-suggestions">
            {units.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <datalist id="sizing-label-suggestions">
            {LABEL_SUGGESTIONS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">
              General Information
            </h3>
            <div className="space-y-2">
              <Label htmlFor="size-label">Size Label *</Label>
              <Input
                id="size-label"
                placeholder="e.g. Shirt, Pant, Blazer"
                value={sizeLabel}
                onChange={(e) => setSizeLabel(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="size">Size *</Label>
                <Input
                  id="size"
                  placeholder="e.g. 22"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Measurement Unit *</Label>
                <Input
                  id="unit"
                  list="sizing-unit-suggestions"
                  placeholder="Inch, CM, Meter…"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">
                Measurements
              </h3>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#CF0A0A] hover:text-[#DC5F00] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Measurement
              </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={rows.map((r) => r.key)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {rows.map((r) => (
                    <SortableRow
                      key={r.key}
                      row={r}
                      onChange={(patch) => patchRow(r.key, patch)}
                      onRemove={() => removeRow(r.key)}
                      canRemove={rows.length > 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <p className="text-xs text-black/45">
              Drag <GripVertical className="inline h-3 w-3 -mt-0.5" /> to reorder. Labels must be unique.
            </p>
          </section>
        </div>

        <DialogFooter className="p-4 border-t border-[#E5E7EB] gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="rounded-lg bg-[#CF0A0A] hover:bg-[#DC5F00] text-white"
          >
            {mut.isPending ? "Saving…" : "Save Size Measurement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
