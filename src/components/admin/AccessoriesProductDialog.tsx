import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Trash2,
  GripVertical,
  Star,
  Upload,
  Check,
  X,
  Layers,
  Eye,
  Unlock,
} from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RichTextEditor } from "./RichTextEditor";
import {
  createAccessoriesProduct,
  listAccessoriesClasses,
  updateAccessoriesProduct,
  type AccessoriesProductDetail,
} from "@/lib/accessories-product.functions";
import { listSizingTemplates, type SizingTemplate } from "@/lib/medical-product.functions";
import { ProductTypesEditor } from "@/components/admin/ProductTypesEditor";


type ImageDraft = {
  key: string;
  id?: string;
  existingUrl?: string;
  newUpload?: { dataUrl: string; filename: string };
  is_primary: boolean;
};
type SizeDraft = {
  key: string;
  id?: string;
  size: string;
  price: string;
  sale_price: string;
};
type ColourDraft = {
  key: string;
  id?: string;
  colour_name: string;
  hex_code: string;
  hex_input: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function computeCustomerSees(product: string, company: string, category: string): string {
  const p = product.trim();
  const c = company.trim();
  const cat = category.trim();
  const parts: string[] = [];
  if (c) parts.push(c);
  if (p && p.toLowerCase() !== c.toLowerCase()) parts.push(p);
  if (cat) parts.push(cat);
  return parts.join(" ");
}


function readFile(file: File): Promise<{ dataUrl: string; filename: string }> {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) return reject(new Error("Image must be under 5MB"));
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type))
      return reject(new Error("Only JPG, PNG or WEBP"));
    const r = new FileReader();
    r.onload = () => resolve({ dataUrl: r.result as string, filename: file.name });
    r.onerror = () => reject(new Error("Read failed"));
    r.readAsDataURL(file);
  });
}

function ImageTile({
  img,
  onRemove,
  onPrimary,
}: {
  img: ImageDraft;
  onRemove: () => void;
  onPrimary: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: img.key,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const src = img.newUpload?.dataUrl ?? img.existingUrl ?? "";
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-xl border overflow-hidden bg-[#F9FAFB] w-[120px] h-[150px] shrink-0 ${
        img.is_primary ? "border-[#CF0A0A] ring-2 ring-[#CF0A0A]/25" : "border-[#E5E7EB]"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 z-10 cursor-grab active:cursor-grabbing rounded-md bg-black/50 text-white p-1"
      >
        <GripVertical className="h-3 w-3" />
      </div>
      {img.is_primary && (
        <span className="absolute top-1 right-1 z-10 rounded-full bg-[#CF0A0A] text-white text-[9px] font-semibold px-1.5 py-0.5">
          Primary
        </span>
      )}
      <img src={src} alt="" className="max-w-full max-h-full object-contain p-1.5" />
      <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onPrimary}
          disabled={img.is_primary}
          className="text-[9px] rounded-md bg-white/90 hover:bg-white text-black px-1.5 py-0.5 disabled:opacity-50 flex items-center gap-0.5"
        >
          <Star className="h-2.5 w-2.5" />
          Primary
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-[9px] rounded-md bg-[#CF0A0A] hover:bg-[#DC5F00] text-white px-1.5 py-0.5 flex items-center gap-0.5"
        >
          <X className="h-2.5 w-2.5" />
          Remove
        </button>
      </div>
    </div>
  );
}

function SizeRow({
  row,
  locked,
  onChange,
  onDelete,
}: {
  row: SizeDraft;
  locked: boolean;
  onChange: (patch: Partial<SizeDraft>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.key,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[24px_1fr_140px_140px_36px] items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-black/40 hover:text-black/70"
        aria-label="Drag"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={row.size}
        placeholder="Size (e.g. S, M, 32)"
        onChange={(e) => onChange({ size: e.target.value })}
        readOnly={locked}
        className={`h-9 rounded-lg ${locked ? "bg-[#F5F5F5] text-black/70" : ""}`}
      />
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-black/45">Rs</span>
        <Input
          type="number"
          value={row.price}
          onChange={(e) => onChange({ price: e.target.value })}
          placeholder="Price"
          className="h-9 rounded-lg pl-8"
          min={0}
        />
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-black/45">Rs</span>
        <Input
          type="number"
          value={row.sale_price}
          onChange={(e) => onChange({ sale_price: e.target.value })}
          placeholder="Sale (opt)"
          className="h-9 rounded-lg pl-8"
          min={0}
        />
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="grid place-items-center h-9 w-9 rounded-lg text-[#CF0A0A] hover:bg-[#CF0A0A]/[0.08]"
        aria-label="Delete size"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function MeasurementView({
  template,
  onClose,
}: {
  template: SizingTemplate | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Measurements</DialogTitle>
        </DialogHeader>
        {template && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-black/45">Size Label</p>
                <p className="font-semibold text-black">{template.size_label}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-black/45">Size</p>
                <p className="font-semibold text-black">{template.size}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-black/45">Unit</p>
                <p className="font-semibold text-black">{template.measurement_unit}</p>
              </div>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F9FAFB] text-black/60 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Measurement</th>
                    <th className="text-right px-3 py-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {template.measurements.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-4 text-center text-black/50">
                        No measurements
                      </td>
                    </tr>
                  ) : (
                    template.measurements.map((m, i) => (
                      <tr key={i} className="border-t border-[#F1F1F1]">
                        <td className="px-3 py-2 text-black">{m.measurement_label}</td>
                        <td className="px-3 py-2 text-right text-black font-medium">
                          {m.measurement_value}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-lg">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplatePicker({
  open,
  onOpenChange,
  existingSizes,
  onImport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingSizes: string[];
  onImport: (templates: SizingTemplate[]) => void;
}) {
  const fn = useServerFn(listSizingTemplates);
  const q = useQuery({
    queryKey: ["sizing-templates"],
    queryFn: () => fn(),
    enabled: open,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<SizingTemplate | null>(null);

  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  const existingSet = useMemo(
    () => new Set(existingSizes.map((s) => s.trim().toLowerCase())),
    [existingSizes],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, SizingTemplate[]>();
    for (const t of q.data ?? []) {
      const arr = map.get(t.size_label) ?? [];
      arr.push(t);
      map.set(t.size_label, arr);
    }
    return Array.from(map.entries()).map(([label, items]) => ({
      label,
      items: items
        .slice()
        .sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true })),
    }));
  }, [q.data]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleOk = () => {
    const all = q.data ?? [];
    const picks = all.filter((t) => selected.has(t.id));
    const filtered = picks.filter((t) => !existingSet.has(t.size.trim().toLowerCase()));
    const skipped = picks.length - filtered.length;
    if (!filtered.length) {
      toast.error(skipped ? "All selected sizes already exist" : "Select at least one size");
      return;
    }
    onImport(filtered);
    if (skipped > 0) toast.info(`${skipped} duplicate size(s) skipped`);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle>Import from Sizing Library</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            {q.isLoading ? (
              <p className="text-sm text-black/50 p-4">Loading…</p>
            ) : grouped.length === 0 ? (
              <p className="text-sm text-black/50 p-4">
                No sizing templates yet. Create one in Product Mapping → Sizing.
              </p>
            ) : (
              grouped.map((group) => (
                <div
                  key={group.label}
                  className="rounded-xl border border-[#E5E7EB] overflow-hidden"
                >
                  <div className="bg-[#F9FAFB] px-3 py-2 border-b border-[#E5E7EB]">
                    <p className="text-sm font-semibold text-black">{group.label}</p>
                  </div>
                  <div className="divide-y divide-[#F1F1F1]">
                    {group.items.map((t) => {
                      const checked = selected.has(t.id);
                      const dup = existingSet.has(t.size.trim().toLowerCase());
                      return (
                        <div
                          key={t.id}
                          className={`flex items-center gap-2 px-3 py-2 ${dup ? "bg-black/[0.02]" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => !dup && toggle(t.id)}
                            disabled={dup}
                            className={`h-4 w-4 rounded grid place-items-center border ${
                              checked
                                ? "border-[#CF0A0A] bg-[#CF0A0A] text-white"
                                : "border-black/30"
                            } ${dup ? "opacity-40 cursor-not-allowed" : ""}`}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => !dup && toggle(t.id)}
                            disabled={dup}
                            className="flex-1 text-left text-sm text-black disabled:text-black/40"
                          >
                            {t.size}
                            <span className="ml-2 text-xs text-black/45">
                              · {t.measurement_unit}
                            </span>
                            {dup && (
                              <span className="ml-2 text-[11px] text-black/45">
                                already added
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewing(t)}
                            className="grid place-items-center h-8 w-8 rounded-md text-black/60 hover:bg-black/[0.06]"
                            aria-label="View measurements"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              onClick={handleOk}
              disabled={selected.size === 0}
              className="rounded-lg bg-[#CF0A0A] hover:bg-[#DC5F00] text-white"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MeasurementView template={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

export function AccessoriesProductDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  product,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categoryId: string;
  categoryName: string;
  product: AccessoriesProductDetail | null;
}) {

  const qc = useQueryClient();
  const createFn = useServerFn(createAccessoriesProduct);
  const updateFn = useServerFn(updateAccessoriesProduct);
  const isEdit = !!product;

  const [productName, setProductName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(5);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isDeal, setIsDeal] = useState(false);
  const [isOOS, setIsOOS] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [sizes, setSizes] = useState<SizeDraft[]>([
    { key: uid(), size: "", price: "", sale_price: "" },
  ]);
  const [sizesLocked, setSizesLocked] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [genderInput, setGenderInput] = useState("");
  const [colours, setColours] = useState<ColourDraft[]>([]);
  const [classMap, setClassMap] = useState<Record<string, Set<string>>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const classesFn = useServerFn(listAccessoriesClasses);
  const classesQ = useQuery({
    queryKey: ["accessories-classes"],
    queryFn: () => classesFn(),
    enabled: open,
  });
  const classes = classesQ.data ?? [];


  useEffect(() => {
    if (!open) return;
    if (product) {
      setProductName(product.product_name ?? "");
      setCompanyName(product.company_name ?? "");
      setDescription(product.description);
      setRating(product.rating);
      setIsFeatured(product.is_featured);
      setIsDeal(product.is_deal);
      setIsOOS(product.is_out_of_stock);
      setIsActive(product.is_active);
      setImages(
        product.images.map((i) => ({
          key: uid(),
          id: i.id,
          existingUrl: i.imageUrl ?? undefined,
          is_primary: i.is_primary,
        })),
      );
      const sizeDrafts = product.sizes.length
        ? product.sizes.map((s) => ({
            key: uid(),
            id: s.id,
            size: s.size,
            price: String(s.price),
            sale_price: s.sale_price != null ? String(s.sale_price) : "",
          }))
        : [{ key: uid(), size: "", price: "", sale_price: "" }];
      setSizes(sizeDrafts);
      setSizesLocked(false);
      setTags(product.quality_tags);
      setProductTypes(product.product_types ?? []);
      setGenders(product.genders);
      setColours(
        product.colours.map((c) => ({
          key: uid(),
          id: c.id,
          colour_name: c.colour_name,
          hex_code: c.hex_code,
          hex_input: c.hex_code,
        })),
      );
      const map: Record<string, Set<string>> = {};
      for (const d of sizeDrafts) {
        const hit = product.class_mappings.find(
          (m) => m.size.trim().toLowerCase() === d.size.trim().toLowerCase(),
        );
        map[d.key] = new Set(hit?.class_ids ?? []);
      }
      setClassMap(map);
    } else {
      setProductName("");
      setCompanyName("");
      setDescription("");
      setRating(5);
      setIsFeatured(false);
      setIsDeal(false);
      setIsOOS(false);
      setIsActive(true);
      setImages([]);
      setSizes([{ key: uid(), size: "", price: "", sale_price: "" }]);
      setSizesLocked(false);
      setTags([]);
      setProductTypes([]);
      setGenders([]);
      setColours([]);
      setClassMap({});
    }

    setTagInput("");
    setGenderInput("");
  }, [open, product]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const customerSees = computeCustomerSees(productName, companyName, categoryName);
  const bothEmpty = !productName.trim() && !companyName.trim();

  const handleImages = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const newDrafts: ImageDraft[] = [];
      for (const f of Array.from(files)) {
        const up = await readFile(f);
        newDrafts.push({ key: uid(), newUpload: up, is_primary: false });
      }
      setImages((prev) => {
        const combined = [...prev, ...newDrafts];
        if (!combined.some((c) => c.is_primary) && combined[0]) combined[0].is_primary = true;
        return combined;
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onImageDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setImages((prev) => {
      const oldIdx = prev.findIndex((p) => p.key === active.id);
      const newIdx = prev.findIndex((p) => p.key === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };
  const onSizeDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSizes((prev) => {
      const oldIdx = prev.findIndex((p) => p.key === active.id);
      const newIdx = prev.findIndex((p) => p.key === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const removeImage = (key: string) =>
    setImages((prev) => {
      const next = prev.filter((p) => p.key !== key);
      if (next.length && !next.some((n) => n.is_primary)) next[0].is_primary = true;
      return next;
    });
  const setPrimary = (key: string) =>
    setImages((prev) => prev.map((p) => ({ ...p, is_primary: p.key === key })));

  const addManualSize = () => {
    const key = uid();
    setSizes((s) => [...s, { key, size: "", price: "", sale_price: "" }]);
    setClassMap((m) => ({ ...m, [key]: new Set() }));
  };

  const removeSize = (key: string) => {
    setSizes((prev) => (prev.length === 1 && !sizesLocked ? prev : prev.filter((r) => r.key !== key)));
    setClassMap((m) => {
      const { [key]: _drop, ...rest } = m;
      return rest;
    });
  };

  const toggleClassForSize = (sizeKey: string, classId: string) => {
    setClassMap((prev) => {
      const cur = new Set(prev[sizeKey] ?? []);
      if (cur.has(classId)) cur.delete(classId);
      else cur.add(classId);
      return { ...prev, [sizeKey]: cur };
    });
  };

  const importFromTemplates = (templates: SizingTemplate[]) => {
    const existing = sizes.filter((s) => s.size.trim() || s.price.trim() || s.sale_price.trim());
    const newRows: SizeDraft[] = templates.map((t) => ({
      key: uid(),
      size: t.size,
      price: "",
      sale_price: "",
    }));
    const combined = [...existing, ...newRows];
    const seen = new Set<string>();
    const dedup: SizeDraft[] = [];
    for (const r of combined) {
      const k = r.size.trim().toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      dedup.push(r);
    }
    setSizes(dedup);
    setClassMap((prev) => {
      const next: Record<string, Set<string>> = {};
      for (const r of dedup) next[r.key] = prev[r.key] ?? new Set();
      return next;
    });
    setSizesLocked(true);
    toast.success(`Imported ${newRows.length} size${newRows.length === 1 ? "" : "s"} — enter pricing`);
  };

  const switchToManual = () => {
    setSizesLocked(false);
    toast.info("Manual size entry enabled");
  };

  const addTag = () => {
    const v = tagInput.trim().toUpperCase();
    if (!v) return;
    if (tags.includes(v)) {
      setTagInput("");
      return;
    }
    setTags([...tags, v]);
    setTagInput("");
  };
  const addGender = () => {
    const v = genderInput.trim();
    if (!v) return;
    if (genders.some((g) => g.toLowerCase() === v.toLowerCase())) {
      setGenderInput("");
      return;
    }
    setGenders([...genders, v]);
    setGenderInput("");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const p = productName.trim();
      const c = companyName.trim();
      if (!p && !c) throw new Error("Please enter either a Product Name or a Company Name.");
      if (!sizes.length) throw new Error("At least one size is required");

      const preparedSizes = sizes.map((s) => {
        const price = Number(s.price);
        if (!s.size.trim()) throw new Error("Size cannot be empty");
        if (!Number.isFinite(price) || price <= 0)
          throw new Error(`Invalid price for size "${s.size}"`);
        const sp = s.sale_price.trim() === "" ? null : Number(s.sale_price);
        if (sp != null && (!Number.isFinite(sp) || sp <= 0))
          throw new Error(`Invalid sale price for "${s.size}"`);
        return { id: s.id, size: s.size.trim(), price, sale_price: sp };
      });

      const preparedImages = images.map((img) => {
        if (img.id) return { id: img.id, is_primary: img.is_primary };
        if (!img.newUpload) throw new Error("Missing image data");
        return { upload: img.newUpload, is_primary: img.is_primary };
      });

      const preparedColours = colours.map((cc) => {
        if (!cc.colour_name.trim()) throw new Error("Colour name is required");
        if (!HEX_RE.test(cc.hex_code)) throw new Error(`Invalid hex "${cc.hex_code}"`);
        return { id: cc.id, colour_name: cc.colour_name, hex_code: cc.hex_code };
      });

      const payload = {
        category_id: categoryId,
        product_name: p || null,
        company_name: c || null,
        description,
        rating,
        is_featured: isFeatured,
        is_deal: isDeal,
        is_out_of_stock: isOOS,
        is_active: isActive,
        images: preparedImages,
        sizes: preparedSizes,
        quality_tags: tags,
        product_types: productTypes,
        colours: preparedColours,
        genders,
        class_mappings: sizes
          .filter((s) => s.size.trim())
          .map((s) => ({ size: s.size.trim(), class_ids: Array.from(classMap[s.key] ?? []) })),
      };


      if (isEdit && product) {
        return updateFn({ data: { id: product.id, ...payload } });
      }
      return createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Product updated" : "Product created");
      qc.invalidateQueries({ queryKey: ["accessories-products", categoryId] });
      qc.invalidateQueries({ queryKey: ["accessories-categories"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disableSubmit = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Accessory Product" : "Add Accessory Product"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Section title="Basic Info">
            <div>
              <Label>Product Name</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. School Bag"
                className="h-10 rounded-xl mt-1.5"
              />
            </div>
            <div className="mt-3">
              <Label>Company Name</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Nike"
                className="h-10 rounded-xl mt-1.5"
              />
            </div>
            <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
              <p className="text-[11px] uppercase tracking-wide text-black/45 font-medium">
                Customer Sees
              </p>
              {bothEmpty ? (
                <p className="mt-1 text-sm text-[#CF0A0A]">
                  Please enter either a Product Name or a Company Name.
                </p>
              ) : (
                <p className="mt-1 text-base font-semibold text-black">{customerSees}</p>
              )}
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <Label>Rating</Label>
                <span className="text-xs font-semibold text-black">{rating.toFixed(1)} / 5</span>
              </div>
              <Slider
                min={0}
                max={5}
                step={0.1}
                value={[rating]}
                onValueChange={(v) => setRating(Number(v[0].toFixed(1)))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <FlagToggle label="Featured" value={isFeatured} onChange={setIsFeatured} />
              <FlagToggle label="Deal" value={isDeal} onChange={setIsDeal} />
              <FlagToggle label="Out of Stock" value={isOOS} onChange={setIsOOS} />
              <FlagToggle label="Active" value={isActive} onChange={setIsActive} />
            </div>
          </Section>

          <Section title="Product Images">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                handleImages(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-[#E5E7EB] hover:border-[#CF0A0A] hover:bg-[#CF0A0A]/[0.02] p-4 text-center transition-colors"
            >
              <Upload className="mx-auto h-5 w-5 text-black/40" />
              <p className="mt-1 text-xs font-medium text-black/70">Click to upload images</p>
              <p className="text-[11px] text-black/50 mt-1 leading-relaxed">
                Recommended: 1200 × 1500 px (portrait 4:5)
                <br />
                JPG, PNG or WEBP · up to 5MB each
              </p>
            </button>
            {images.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onImageDragEnd}
              >
                <SortableContext items={images.map((i) => i.key)} strategy={rectSortingStrategy}>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {images.map((img) => (
                      <ImageTile
                        key={img.key}
                        img={img}
                        onPrimary={() => setPrimary(img.key)}
                        onRemove={() => removeImage(img.key)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </Section>
        </div>

        <Section title="Gender (Optional)">
          <div className="flex gap-2">
            <Input
              value={genderInput}
              onChange={(e) => setGenderInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addGender();
                }
              }}
              placeholder="e.g. Male, Female, Unisex"
              className="h-10 rounded-xl"
            />
            <Button
              type="button"
              onClick={addGender}
              className="rounded-xl bg-black hover:bg-black/85 text-white"
            >
              Add
            </Button>
          </div>
          {genders.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {genders.map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center gap-1 rounded-full bg-black/[0.06] text-black/80 text-xs font-medium px-2.5 py-1"
                >
                  {g}
                  <button
                    type="button"
                    onClick={() => setGenders((prev) => prev.filter((x) => x !== g))}
                    className="hover:text-[#CF0A0A]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-[11px] text-black/50 mt-2">
            Optional. Leave empty — no gender badge is shown on frontend.
          </p>
        </Section>

        <Section title="Description">
          <RichTextEditor value={description} onChange={setDescription} />
        </Section>

        <Section
          title="Sizes & Pricing"
          action={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
                className="rounded-lg"
              >
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                Import from Sizing
              </Button>
              {sizesLocked ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={switchToManual}
                  className="rounded-lg"
                >
                  <Unlock className="h-3.5 w-3.5 mr-1.5" />
                  Switch to Manual
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={addManualSize}
                  className="rounded-lg bg-black hover:bg-black/85 text-white"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Size
                </Button>
              )}
            </div>
          }
        >
          {sizesLocked && (
            <p className="text-[11px] text-black/55 mb-2">
              Sizes were imported from the Sizing Library. Enter Price and Sale Price for each.
            </p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onSizeDragEnd}
          >
            <SortableContext items={sizes.map((s) => s.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sizes.map((row) => (
                  <SizeRow
                    key={row.key}
                    row={row}
                    locked={sizesLocked}
                    onChange={(p) =>
                      setSizes((prev) => prev.map((r) => (r.key === row.key ? { ...r, ...p } : r)))
                    }
                    onDelete={() => removeSize(row.key)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </Section>

        <Section title="Classes (Optional)">
          {classes.length === 0 ? (
            <p className="text-xs text-black/50">
              No accessories classes configured yet.
            </p>
          ) : sizes.filter((s) => s.size.trim()).length === 0 ? (
            <p className="text-xs text-black/50">
              Add at least one size above to assign classes.
            </p>
          ) : (
            <div className="space-y-3">
              {sizes.map((s) =>
                s.size.trim() ? (
                  <div
                    key={s.key}
                    className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3"
                  >
                    <p className="text-sm font-semibold text-black mb-2">Size {s.size}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {classes.map((c) => {
                        const checked = classMap[s.key]?.has(c.id) ?? false;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleClassForSize(s.key, c.id)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                              checked
                                ? "border-[#CF0A0A] bg-[#CF0A0A] text-white"
                                : "border-[#E5E7EB] bg-white text-black/70 hover:border-black/40"
                            }`}
                          >
                            <span
                              className={`h-3 w-3 rounded grid place-items-center border ${
                                checked ? "border-white bg-white/20" : "border-black/30"
                              }`}
                            >
                              {checked && <Check className="h-2.5 w-2.5 text-white" />}
                            </span>
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          )}
        </Section>



        <Section title="Product Types (Optional)">
          <ProductTypesEditor value={productTypes} onChange={setProductTypes} />
        </Section>

        <Section title="Quality Tags">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="e.g. PREMIUM, LEATHER, WATERPROOF"
              className="h-10 rounded-xl"
            />
            <Button
              type="button"
              onClick={addTag}
              className="rounded-xl bg-black hover:bg-black/85 text-white"
            >
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-black/[0.06] text-black/80 text-xs font-medium px-2.5 py-1"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    className="hover:text-[#CF0A0A]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Colours"
          action={
            <Button
              type="button"
              size="sm"
              onClick={() =>
                setColours((c) => [
                  ...c,
                  { key: uid(), colour_name: "", hex_code: "#000000", hex_input: "#000000" },
                ])
              }
              className="rounded-lg bg-black hover:bg-black/85 text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Colour
            </Button>
          }
        >
          {colours.length === 0 ? (
            <p className="text-xs text-black/50">No colours added.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {colours.map((c) => {
                const valid = HEX_RE.test(c.hex_input);
                return (
                  <div
                    key={c.key}
                    className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white p-2"
                  >
                    <span
                      className={`h-9 w-9 rounded-md border ${valid ? "border-[#E5E7EB]" : "border-[#CF0A0A]"}`}
                      style={{ backgroundColor: valid ? c.hex_code : "transparent" }}
                    />
                    <input
                      type="color"
                      value={c.hex_code}
                      onChange={(e) => {
                        const v = e.target.value;
                        setColours((prev) =>
                          prev.map((x) =>
                            x.key === c.key ? { ...x, hex_code: v, hex_input: v } : x,
                          ),
                        );
                      }}
                      className="h-9 w-8 rounded-md border border-[#E5E7EB] cursor-pointer bg-white shrink-0"
                    />
                    <Input
                      value={c.hex_input}
                      placeholder="#RRGGBB"
                      onChange={(e) => {
                        let v = e.target.value.trim();
                        if (v && !v.startsWith("#")) v = "#" + v;
                        setColours((prev) =>
                          prev.map((x) =>
                            x.key === c.key
                              ? {
                                  ...x,
                                  hex_input: v,
                                  hex_code: HEX_RE.test(v) ? v.toLowerCase() : x.hex_code,
                                }
                              : x,
                          ),
                        );
                      }}
                      className={`h-9 rounded-lg w-24 font-mono text-xs uppercase ${
                        !valid ? "border-[#CF0A0A] focus-visible:ring-[#CF0A0A]/30" : ""
                      }`}
                    />
                    <Input
                      value={c.colour_name}
                      placeholder="Colour name"
                      onChange={(e) =>
                        setColours((prev) =>
                          prev.map((x) =>
                            x.key === c.key ? { ...x, colour_name: e.target.value } : x,
                          ),
                        )
                      }
                      className="h-9 rounded-lg flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setColours((prev) => prev.filter((x) => x.key !== c.key))
                      }
                      className="grid place-items-center h-9 w-9 rounded-lg text-[#CF0A0A] hover:bg-[#CF0A0A]/[0.08] shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={disableSubmit}
            className="rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={disableSubmit}
            className="rounded-lg bg-[#CF0A0A] hover:bg-[#DC5F00] text-white"
          >
            {disableSubmit ? "Saving…" : isEdit ? "Save Changes" : "Save"}
          </Button>
        </DialogFooter>

        <TemplatePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          existingSizes={sizes.map((s) => s.size)}
          onImport={importFromTemplates}
        />
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-black">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function FlagToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
      <span className="text-sm text-black/80">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
