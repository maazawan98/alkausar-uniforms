import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  MapPin,
  Sparkles,
  Check,
  X,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCollege,
  listClasses,
  upsertClass,
  addStandardClasses,
  deleteClasses,
  reorderClasses,
  listCampuses,
  upsertCampus,
  deleteCampus,
  reorderCampuses,
  type CollegeClass,
  type CollegeCampus,
} from "@/lib/college.functions";

export const Route = createFileRoute("/admin/colleges/$slug/structure")({
  loader: async ({ params }) => {
    const college = await getCollege({ data: { slug: params.slug } });
    return { college };
  },
  component: StructurePage,
});

function StructurePage() {
  const { college } = Route.useLoaderData();
  if (!college) return null;

  return (
    <div>
      <Link
        to="/admin/colleges/$slug"
        params={{ slug: college.slug }}
        className="inline-flex items-center gap-1.5 text-sm text-black/60 hover:text-black mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to college
      </Link>
      <div className="pb-6 mb-8 border-b border-[#E5E7EB]">
        <p className="text-xs uppercase tracking-[0.22em] text-black/45">{college.name}</p>
        <h2 className="mt-1 text-2xl md:text-3xl font-bold text-black tracking-tight">
          College Structure
        </h2>
        <p className="mt-2 text-[15px] text-black/55">
          Manage the classes and campuses for this college.
        </p>
      </div>
      <div className="space-y-8">
        <ClassesModule collegeId={college.id} />
        <CampusesModule collegeId={college.id} />
      </div>
    </div>
  );
}

/* ============================================================
   CLASSES
   ============================================================ */

const COUNTRIES = [
  "Pakistan",
  "United Arab Emirates",
  "Saudi Arabia",
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "Qatar",
  "Bahrain",
  "Oman",
  "Kuwait",
];

function ClassesModule({ collegeId }: { collegeId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listClasses);
  const upsert = useServerFn(upsertClass);
  const addStandard = useServerFn(addStandardClasses);
  const delMany = useServerFn(deleteClasses);
  const reorder = useServerFn(reorderClasses);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CollegeClass | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [order, setOrder] = useState<CollegeClass[]>([]);

  const q = useQuery({
    queryKey: ["classes", collegeId],
    queryFn: () => list({ data: { collegeId } }),
  });

  useEffect(() => {
    if (q.data) setOrder(q.data);
  }, [q.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["classes", collegeId] });

  const save = useMutation({
    mutationFn: (name: string) =>
      upsert({ data: { id: editing?.id, collegeId, name } }),
    onSuccess: () => {
      toast.success(editing ? "Class updated" : "Class added");
      invalidate();
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const standard = useMutation({
    mutationFn: () => addStandard({ data: { collegeId } }),
    onSuccess: (res) => {
      if (res.inserted === 0) toast.info("All standard classes have already been added.");
      else toast.success(`Added ${res.inserted} standard ${res.inserted === 1 ? "class" : "classes"}`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMany = useMutation({
    mutationFn: (ids: string[]) => delMany({ data: { ids } }),
    onSuccess: (res) => {
      toast.success(`Deleted ${res.deleted} ${res.deleted === 1 ? "class" : "classes"}`);
      invalidate();
      setSelected(new Set());
      setConfirmDelete(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMut = useMutation({
    mutationFn: (ids: string[]) => reorder({ data: { collegeId, ids } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes", collegeId] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      invalidate();
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const items = order;
  const allSelected = items.length > 0 && selected.size === items.length;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setOrder(next);
    reorderMut.mutate(next.map((i) => i.id));
  };

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#CF0A0A]/10 grid place-items-center">
            <GraduationCap className="h-4.5 w-4.5 text-[#CF0A0A]" />
          </div>
          <div>
            <h3 className="font-semibold text-black">Classes</h3>
            <p className="text-xs text-black/50">{items.length} total · drag to reorder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => standard.mutate()}
            disabled={standard.isPending}
            className="h-9 rounded-lg border-[#E5E7EB] hover:bg-black/[0.03]"
          >
            <Sparkles className="h-4 w-4 mr-1.5 text-[#DC5F00]" />
            {standard.isPending ? "Adding..." : "Standard Classes"}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="bg-[#CF0A0A] hover:bg-[#DC5F00] text-white h-9 rounded-lg"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Class
          </Button>
        </div>
      </header>

      <div className="p-5">
        {items.length > 0 && (
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#F1F1F1]">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(v) => {
                if (v) setSelected(new Set(items.map((i) => i.id)));
                else setSelected(new Set());
              }}
              aria-label="Select all"
            />
            <span className="text-xs text-black/50">
              {allSelected ? "Deselect all" : "Select all"}
            </span>
          </div>
        )}

        {q.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-[#F9FAFB] animate-pulse" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map((it) => (
                  <SortableClassCard
                    key={it.id}
                    item={it}
                    selected={selected.has(it.id)}
                    onToggle={() => toggle(it.id)}
                    onEdit={() => {
                      setEditing(it);
                      setDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="text-center py-14 border-2 border-dashed border-[#E5E7EB] rounded-xl">
            <GraduationCap className="mx-auto h-9 w-9 text-black/25" />
            <p className="mt-3 text-sm font-medium text-black">No classes yet</p>
            <p className="text-xs text-black/50 mt-1">
              Click "Standard Classes" to add a preset, or "Add Class" for a custom one.
            </p>
          </div>
        )}
      </div>

      {/* Floating action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-black text-white px-4 py-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="h-6 min-w-6 px-1.5 rounded-full bg-[#CF0A0A] grid place-items-center text-xs font-semibold">
              {selected.size}
            </span>
            <span className="text-sm">Selected</span>
          </div>
          <div className="h-5 w-px bg-white/15" />
          <Button
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="bg-[#CF0A0A] hover:bg-[#DC5F00] h-8 rounded-lg text-white"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete Selected
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="p-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <ClassNameDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Class" : "Add Class"}
        initial={editing?.name}
        saving={save.isPending}
        onSave={(name) => save.mutate(name)}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Classes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the selected {selected.size}{" "}
              {selected.size === 1 ? "class" : "classes"}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMany.mutate(Array.from(selected))}
              className="bg-[#CF0A0A] hover:bg-[#DC5F00]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function SortableClassCard({
  item,
  selected,
  onToggle,
  onEdit,
}: {
  item: CollegeClass;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "group relative rounded-xl border p-4 bg-white transition-shadow",
        isDragging
          ? "shadow-[0_20px_45px_-15px_rgba(0,0,0,0.35)] border-black/30"
          : selected
          ? "border-[#CF0A0A] bg-[#CF0A0A]/[0.03] shadow-[0_4px_16px_-8px_rgba(207,10,10,0.3)]"
          : "border-[#E5E7EB] hover:border-black/20 hover:shadow-sm",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 -ml-1 rounded-md text-black/35 hover:text-black hover:bg-black/[0.05] cursor-grab active:cursor-grabbing touch-none"
            aria-label={`Drag ${item.name}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={`Select ${item.name}`}
          />
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-md hover:bg-black/[0.05] text-black/60 hover:text-black"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-3 font-medium text-black text-sm truncate">{item.name}</p>
    </div>
  );
}

function ClassNameDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial?: string;
  onSave: (name: string) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(initial ?? "");
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) setValue(initial ?? "");
      }}
    >
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="class-name">Class Name</Label>
          <Input
            id="class-name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            maxLength={120}
            placeholder="e.g. O-Level"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(value.trim())}
            disabled={saving || !value.trim()}
            className="bg-[#CF0A0A] hover:bg-[#DC5F00] text-white"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   CAMPUSES
   ============================================================ */

function CampusesModule({ collegeId }: { collegeId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listCampuses);
  const del = useServerFn(deleteCampus);
  const reorder = useServerFn(reorderCampuses);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CollegeCampus | null>(null);
  const [deleting, setDeleting] = useState<CollegeCampus | null>(null);
  const [order, setOrder] = useState<CollegeCampus[]>([]);

  const q = useQuery({
    queryKey: ["campuses", collegeId],
    queryFn: () => list({ data: { collegeId } }),
  });

  useEffect(() => {
    if (q.data) setOrder(q.data);
  }, [q.data]);

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Campus deleted");
      qc.invalidateQueries({ queryKey: ["campuses", collegeId] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMut = useMutation({
    mutationFn: (ids: string[]) => reorder({ data: { collegeId, ids } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campuses", collegeId] }),
    onError: (e: Error) => {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ["campuses", collegeId] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const items = order;

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setOrder(next);
    reorderMut.mutate(next.map((i) => i.id));
  };

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#CF0A0A]/10 grid place-items-center">
            <MapPin className="h-4.5 w-4.5 text-[#CF0A0A]" />
          </div>
          <div>
            <h3 className="font-semibold text-black">Campuses</h3>
            <p className="text-xs text-black/50">{items.length} total · drag to reorder</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="bg-[#CF0A0A] hover:bg-[#DC5F00] text-white h-9 rounded-lg"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Campus
        </Button>
      </header>

      <div className="p-5">
        {q.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-[#F9FAFB] animate-pulse" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((c) => (
                  <SortableCampusCard
                    key={c.id}
                    campus={c}
                    onEdit={() => {
                      setEditing(c);
                      setDialogOpen(true);
                    }}
                    onDelete={() => setDeleting(c)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="text-center py-14 border-2 border-dashed border-[#E5E7EB] rounded-xl">
            <MapPin className="mx-auto h-9 w-9 text-black/25" />
            <p className="mt-3 text-sm font-medium text-black">No campuses yet</p>
            <p className="text-xs text-black/50 mt-1">Click "Add Campus" to create one.</p>
          </div>
        )}
      </div>

      <CampusDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        collegeId={collegeId}
        editing={editing}
        existing={items}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete campus "{deleting?.campus_name || `${deleting?.area} Campus`}"?
            </AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && remove.mutate(deleting.id)}
              className="bg-[#CF0A0A] hover:bg-[#DC5F00]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function SortableCampusCard({
  campus,
  onEdit,
  onDelete,
}: {
  campus: CollegeCampus;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: campus.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "group relative rounded-xl border bg-white p-5 transition-shadow",
        isDragging
          ? "shadow-[0_20px_45px_-15px_rgba(0,0,0,0.35)] border-black/30"
          : "border-[#E5E7EB] hover:border-black/20 hover:shadow-[0_8px_28px_-14px_rgba(0,0,0,0.15)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 -ml-1 mt-0.5 rounded-md text-black/35 hover:text-black hover:bg-black/[0.05] cursor-grab active:cursor-grabbing touch-none"
            aria-label={`Drag ${campus.campus_name || campus.area}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-black truncate">
              {campus.campus_name || `${campus.area} Campus`}
            </h4>
            <p className="text-xs text-black/50 mt-0.5">
              {campus.campus_name ? "Named campus" : "Location-based"}
            </p>
          </div>
        </div>
        <div className="h-8 w-8 shrink-0 rounded-lg bg-[#F7F7F7] grid place-items-center">
          <MapPin className="h-4 w-4 text-black/40" />
        </div>
      </div>
      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-black/45 text-xs uppercase tracking-wide">City</dt>
          <dd className="text-black text-right truncate">{campus.city}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-black/45 text-xs uppercase tracking-wide">Area</dt>
          <dd className="text-black text-right truncate">{campus.area}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-black/45 text-xs uppercase tracking-wide">Country</dt>
          <dd className="text-black text-right truncate">{campus.country}</dd>
        </div>
      </dl>
      <div className="flex border-t border-[#F1F1F1] mt-4 -mx-5 -mb-5">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-black/70 hover:bg-black/[0.03] transition-colors rounded-bl-xl"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <div className="w-px bg-[#F1F1F1]" />
        <button
          type="button"
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-[#CF0A0A] hover:bg-[#CF0A0A]/[0.05] transition-colors rounded-br-xl"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

function CampusDialog({
  open,
  onOpenChange,
  collegeId,
  editing,
  existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collegeId: string;
  editing: CollegeCampus | null;
  existing: CollegeCampus[];
}) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertCampus);

  const [country, setCountry] = useState(editing?.country ?? "Pakistan");
  const [city, setCity] = useState(editing?.city ?? "");
  const [area, setArea] = useState(editing?.area ?? "");
  const [campusName, setCampusName] = useState(editing?.campus_name ?? "");

  const nameRequired = useMemo(() => {
    const c = country.trim().toLowerCase();
    const ci = city.trim().toLowerCase();
    const a = area.trim().toLowerCase();
    if (!c || !ci || !a) return false;
    return existing.some(
      (e) =>
        e.id !== editing?.id &&
        e.country.toLowerCase() === c &&
        e.city.toLowerCase() === ci &&
        e.area.toLowerCase() === a,
    );
  }, [country, city, area, existing, editing?.id]);

  const save = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          id: editing?.id,
          collegeId,
          country: country.trim(),
          city: city.trim(),
          area: area.trim(),
          campus_name: campusName.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success(editing ? "Campus updated" : "Campus added");
      qc.invalidateQueries({ queryKey: ["campuses", collegeId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSave =
    country.trim() &&
    city.trim() &&
    area.trim() &&
    (!nameRequired || campusName.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Campus" : "Add Campus"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="campus-country">
              Country <span className="text-[#CF0A0A]">*</span>
            </Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger id="campus-country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="campus-city">
                City <span className="text-[#CF0A0A]">*</span>
              </Label>
              <Input
                id="campus-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={120}
                placeholder="e.g. Lahore"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campus-area">
                Area <span className="text-[#CF0A0A]">*</span>
              </Label>
              <Input
                id="campus-area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                maxLength={160}
                placeholder="e.g. Johar Town"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="campus-name">
              Campus Name{" "}
              {nameRequired ? (
                <span className="text-[#CF0A0A]">*</span>
              ) : (
                <span className="text-black/40 text-xs font-normal">(optional)</span>
              )}
            </Label>
            <Input
              id="campus-name"
              value={campusName}
              onChange={(e) => setCampusName(e.target.value)}
              maxLength={160}
              placeholder="e.g. Girls Campus"
            />
            {nameRequired && (
              <p className="text-xs text-[#CF0A0A] flex items-start gap-1.5 pt-1">
                <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Another campus already exists at this location. Add a name to distinguish it.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!canSave || save.isPending}
            className="bg-[#CF0A0A] hover:bg-[#DC5F00] text-white"
          >
            {save.isPending ? "Saving..." : "Save Campus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
