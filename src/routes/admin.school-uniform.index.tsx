import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, School as SchoolIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { SchoolDialog } from "@/components/admin/SchoolDialog";
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
import { listSchools, deleteSchool, type SchoolRow } from "@/lib/school-uniform.functions";

export const Route = createFileRoute("/admin/school-uniform/")({
  component: SchoolsPage,
});

function SchoolsPage() {
  const fetchAll = useServerFn(listSchools);
  const del = useServerFn(deleteSchool);
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolRow | null>(null);
  const [deleting, setDeleting] = useState<SchoolRow | null>(null);

  const { data: schools, isLoading } = useQuery({
    queryKey: ["schools"],
    queryFn: () => fetchAll(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("School deleted");
      qc.invalidateQueries({ queryKey: ["schools"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <PageHeader
          title="School Management"
          subtitle="Add and manage schools, their collections, classes, and campuses."
        />
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="bg-[#CF0A0A] hover:bg-[#DC5F00] text-white rounded-xl shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add School
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-56 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] animate-pulse"
            />
          ))}
        </div>
      ) : schools && schools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {schools.map((s) => (
            <div
              key={s.id}
              className="group relative rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] hover:border-black/10 transition-all"
            >
              <Link
                to="/admin/school-uniform/$slug"
                params={{ slug: s.slug }}
                className="block p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="h-[72px] w-[72px] shrink-0 rounded-[14px] bg-white border border-[#E5E7EB] grid place-items-center overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-6px_rgba(16,24,40,0.08)]">
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt={s.name} className="max-w-full max-h-full object-contain p-1.5" />
                    ) : (
                      <SchoolIcon className="h-7 w-7 text-black/30" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-black truncate">{s.name}</h3>
                    <p className="text-xs text-black/50 truncate mt-0.5">/{s.slug}</p>
                    <span
                      className={[
                        "inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-[11px] font-medium",
                        s.is_active
                          ? "bg-[#10B981]/10 text-[#059669]"
                          : "bg-black/5 text-black/50",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          s.is_active ? "bg-[#10B981]" : "bg-black/30",
                        ].join(" ")}
                      />
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </Link>
              <div className="flex border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(s);
                    setDialogOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-black/70 hover:bg-black/[0.03] transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <div className="w-px bg-[#E5E7EB]" />
                <button
                  type="button"
                  onClick={() => setDeleting(s)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-[#CF0A0A] hover:bg-[#CF0A0A]/[0.05] transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-[#E5E7EB] rounded-2xl">
          <SchoolIcon className="mx-auto h-10 w-10 text-black/25" />
          <p className="mt-3 text-sm font-medium text-black">No schools yet</p>
          <p className="text-xs text-black/50 mt-1">Click "Add School" to create your first one.</p>
        </div>
      )}

      <SchoolDialog open={dialogOpen} onOpenChange={setDialogOpen} school={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the school along with its classes and campuses.
              {deleting && deleting.categoryCount > 0 && (
                <span className="block mt-2 text-[#CF0A0A]">
                  This school has {deleting.categoryCount} categor{deleting.categoryCount === 1 ? "y" : "ies"}. Remove them first before deleting the school.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
              disabled={!!(deleting && deleting.categoryCount > 0) || deleteMut.isPending}
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
