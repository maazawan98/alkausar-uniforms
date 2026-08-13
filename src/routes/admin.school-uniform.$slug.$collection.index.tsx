import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, ImageIcon, Home } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
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
import { CategoryDialog } from "@/components/admin/CategoryDialog";
import {
  getSchool,
  listCategories,
  deleteCategory,
  type SchoolCategory,
} from "@/lib/school-uniform.functions";

export const Route = createFileRoute("/admin/school-uniform/$slug/$collection/")({
  loader: async ({ params }) => {
    const school = await getSchool({ data: { slug: params.slug } });
    return { school };
  },
  component: CategoriesPage,
});

function CategoriesPage() {
  const { school } = Route.useLoaderData();
  const { collection } = Route.useParams();
  const coll = collection as "boys" | "girls";
  const list = useServerFn(listCategories);
  const del = useServerFn(deleteCategory);
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolCategory | null>(null);
  const [deleting, setDeleting] = useState<SchoolCategory | null>(null);

  const query = useQuery({
    queryKey: ["categories", school?.id, coll],
    queryFn: () => list({ data: { schoolId: school!.id, collection: coll } }),
    enabled: !!school,
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["categories", school?.id, coll] });
      qc.invalidateQueries({ queryKey: ["schools"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!school) return null;

  const label = coll === "boys" ? "Boys Collection" : "Girls Collection";

  return (
    <div>
      <Link
        to="/admin/school-uniform/$slug"
        params={{ slug: school.slug }}
        className="inline-flex items-center gap-1.5 text-sm text-black/60 hover:text-black mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to school
      </Link>

      <div className="flex items-start justify-between gap-4 pb-6 mb-8 border-b border-[#E5E7EB]">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-black/45">{school.name}</p>
          <h2 className="mt-1 text-2xl md:text-3xl font-bold text-black tracking-tight">{label}</h2>
          <p className="mt-2 text-[15px] text-black/55">
            Manage categories for this collection. Each category is isolated per school.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="bg-[#CF0A0A] hover:bg-[#DC5F00] text-white rounded-xl shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[248px] rounded-xl bg-[#F9FAFB] animate-pulse" />
          ))}
        </div>
      ) : (query.data?.length ?? 0) === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-white">
          <ImageIcon className="mx-auto h-10 w-10 text-black/25" />
          <p className="mt-3 text-base font-semibold text-black">No Categories Yet</p>
          <p className="text-sm text-black/50 mt-1">Create your first category.</p>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="mt-5 bg-[#CF0A0A] hover:bg-[#DC5F00] text-white rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6 gap-4">
          {query.data!.map((c) => (
            <div
              key={c.id}
              className="group flex flex-col rounded-xl border border-[#E5E7EB] bg-white overflow-hidden cursor-pointer transition-all duration-[220ms] ease-out hover:-translate-y-1 hover:border-[#CF0A0A] hover:shadow-[0_12px_28px_-14px_rgba(207,10,10,0.28)]"
            >
              <Link
                to="/admin/school-uniform/$slug/$collection/$categoryId"
                params={{ slug: school.slug, collection: coll, categoryId: c.id }}
                className="block"
              >
                <div className="h-[140px] bg-[#F7F7F7] overflow-hidden grid place-items-center">
                  {c.imageUrl ? (
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="max-w-full max-h-full object-contain object-center p-3 transition-transform duration-[220ms]"
                      style={{ objectPosition: "center" }}
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-black/20" />
                  )}
                </div>
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[15px] font-semibold text-black truncate leading-tight">
                      {c.name}
                    </h3>
                    {c.show_on_homepage && (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#CF0A0A]/10 text-[#CF0A0A]">
                              <Home className="h-3 w-3" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">Shown on Home Page</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <p className="text-[13px] text-black/50 mt-0.5">{c.productCount} {c.productCount === 1 ? "Product" : "Products"}</p>
                </div>
              </Link>
              <div className="mt-auto flex items-center justify-end gap-1.5 px-3 pb-3 pt-1">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Edit category"
                        onClick={() => {
                          setEditing(c);
                          setDialogOpen(true);
                        }}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-black/70 hover:border-black/30 hover:text-black transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Edit</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Delete category"
                        onClick={() => setDeleting(c)}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#CF0A0A] hover:border-[#CF0A0A] hover:bg-[#CF0A0A]/[0.06] transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Delete</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolId={school.id}
        collection={coll}
        category={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This category will be removed from {school.name}. Any linked products must be removed first.
            </AlertDialogDescription>
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
    </div>
  );
}
