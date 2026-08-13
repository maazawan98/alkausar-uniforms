import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  adminListAccessoriesClasses,
  createAccessoriesClass,
  updateAccessoriesClass,
  deleteAccessoriesClass,
  type AccessoriesClass,
} from "@/lib/accessories.functions";

const LIST_KEY = ["accessories-classes-admin"] as const;

export function AccessoriesClassesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListAccessoriesClasses);
  const createFn = useServerFn(createAccessoriesClass);
  const updateFn = useServerFn(updateAccessoriesClass);
  const deleteFn = useServerFn(deleteAccessoriesClass);

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const q = useQuery({ queryKey: LIST_KEY, queryFn: () => listFn(), enabled: open });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: LIST_KEY });
    // keep the product form's class picker in sync — no refresh needed
    qc.invalidateQueries({ queryKey: ["accessories-classes"] });
  };

  const create = useMutation({
    mutationFn: (v: string) => createFn({ data: { name: v } }),
    onSuccess: () => {
      setName("");
      toast.success("Class added");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: (v: { id: string; name: string }) => updateFn({ data: v }),
    onSuccess: () => {
      setEditingId(null);
      toast.success("Class updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Class deleted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows: AccessoriesClass[] = q.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Manage Classes</DialogTitle>
          <DialogDescription>
            Classes available when mapping accessory product sizes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                e.preventDefault();
                create.mutate(name.trim());
              }
            }}
            placeholder="e.g. Class 1"
            className="h-10 rounded-xl"
          />
          <Button
            type="button"
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate(name.trim())}
            className="h-10 rounded-xl bg-[#CF0A0A] hover:bg-[#DC5F00] text-white shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add
          </Button>
        </div>

        <div className="mt-2 max-h-[340px] overflow-y-auto rounded-xl border border-[#E5E7EB] divide-y divide-[#F1F1F1]">
          {q.isLoading ? (
            <div className="py-10 grid place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-black/40" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-black/45">No classes yet.</p>
          ) : (
            rows.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2.5">
                {editingId === c.id ? (
                  <>
                    <Input
                      value={draft}
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                      className="h-9 rounded-lg"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0"
                      disabled={!draft.trim() || update.isPending}
                      onClick={() => update.mutate({ id: c.id, name: draft.trim() })}
                      aria-label="Save class"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 truncate text-sm font-medium text-black">
                      {c.name}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0"
                      onClick={() => {
                        setEditingId(c.id);
                        setDraft(c.name);
                      }}
                      aria-label="Edit class"
                    >
                      <Pencil className="h-4 w-4 text-black/50" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(c.id)}
                      aria-label="Delete class"
                    >
                      <Trash2 className="h-4 w-4 text-[#CF0A0A]" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
