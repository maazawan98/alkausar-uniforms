import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ImageIcon, MoreVertical, CheckCircle2, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { AccessoriesCategoryDialog } from "@/components/admin/AccessoriesCategoryDialog";
import { AccessoriesClassesDialog } from "@/components/admin/AccessoriesClassesDialog";
import {
  listAccessoriesCategories,
  deleteAccessoriesCategory,
  type AccessoriesCategory,
} from "@/lib/accessories.functions";

export const Route = createFileRoute("/admin/accessories/")({
  component: AccessoriesDashboard,
});

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

function AccessoriesDashboard() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAccessoriesCategories);
  const delFn = useServerFn(deleteAccessoriesCategory);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccessoriesCategory | null>(null);
  const [deleting, setDeleting] = useState<AccessoriesCategory | null>(null);
  const [classesOpen, setClassesOpen] = useState(false);

  const q = useQuery({
    queryKey: ["accessories-categories"],
    queryFn: () => listFn(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["accessories-categories"] });
      setDeleting(null);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setDeleting(null);
    },
  });

  const rows = q.data ?? [];

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-6">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7280]">Module</p>
          <h2 className="mt-1 text-[26px] md:text-[30px] font-bold text-black tracking-tight">
            Accessories
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Independent catalog of accessory categories and products.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => setClassesOpen(true)}
            className="h-10 rounded-xl border-[#E5E7EB]"
          >
            <ListOrdered className="h-4 w-4 mr-2" />
            Manage Classes
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="h-10 rounded-xl bg-[#CF0A0A] hover:bg-[#DC5F00] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {q.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[248px] rounded-xl bg-[#F9FAFB] animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-white">
          <ImageIcon className="mx-auto h-10 w-10 text-black/25" />
          <p className="mt-3 text-base font-semibold text-black">No Categories Yet</p>
          <p className="text-sm text-black/50 mt-1">
            Click "Add Category" to create your first accessory category.
          </p>
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
          {rows.map((c) => (
            <div
              key={c.id}
              className="group flex flex-col rounded-xl border border-[#E5E7EB] bg-white overflow-hidden transition-all duration-[220ms] ease-out hover:-translate-y-1 hover:border-[#CF0A0A] hover:shadow-[0_12px_28px_-14px_rgba(207,10,10,0.28)]"
            >
              <Link
                to="/admin/accessories/$categoryId"
                params={{ categoryId: c.id }}
                className="block"
              >
                <div className="h-[140px] bg-[#F7F7F7] overflow-hidden grid place-items-center">
                  {c.imageUrl ? (
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="max-w-full max-h-full object-contain object-center p-3 transition-transform duration-[220ms]"
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
                    {c.is_active ? (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#22C55E]/12 text-[#15803D]">
                              <CheckCircle2 className="h-3 w-3" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">Active</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="shrink-0 inline-flex items-center rounded-md bg-black/[0.06] text-black/60 text-[10px] font-semibold px-1.5 py-0.5">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-black/50 mt-0.5">
                    {c.productCount} {c.productCount === 1 ? "Product" : "Products"}
                  </p>
                  <p className="text-[11px] text-black/40 mt-1">{fmtDate(c.created_at)}</p>
                </div>
              </Link>
              <div className="mt-auto flex items-center justify-end gap-1.5 px-3 pb-3 pt-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="More"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-black/70 hover:border-black/30 hover:text-black transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-xl">
                    <DropdownMenuItem
                      className="rounded-lg cursor-pointer"
                      onSelect={() => {
                        setEditing(c);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="rounded-lg cursor-pointer text-[#CF0A0A] focus:text-[#CF0A0A]"
                      onSelect={() => setDeleting(c)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <AccessoriesCategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
      />

      <AccessoriesClassesDialog open={classesOpen} onOpenChange={setClassesOpen} />



      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && deleting.productCount > 0 ? (
                <>
                  This category cannot be deleted because it contains{" "}
                  <b>
                    {deleting.productCount}{" "}
                    {deleting.productCount === 1 ? "product" : "products"}
                  </b>
                  . Please delete all products first.
                </>
              ) : (
                <>
                  This will permanently remove the category. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {deleting && deleting.productCount === 0 && (
              <AlertDialogAction
                onClick={() => remove.mutate(deleting.id)}
                className="bg-[#CF0A0A] hover:bg-[#DC5F00]"
              >
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
