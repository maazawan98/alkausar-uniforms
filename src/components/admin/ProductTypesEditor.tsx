import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Check, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Optional per-product "Product Types" editor (Half Sleeves, Slim Fit, ...).
 * Chips are addable, editable, removable and reorderable via drag & drop.
 */
export function ProductTypesEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const add = () => {
    const v = input.trim().replace(/\s+/g, " ");
    if (!v) return;
    if (value.some((t) => t.toLowerCase() === v.toLowerCase())) {
      setInput("");
      return;
    }
    onChange([...value, v]);
    setInput("");
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = value.indexOf(String(active.id));
    const to = value.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onChange(arrayMove(value, from, to));
  };

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. Half Sleeves, Slim Fit, Pack of 3"
          className="h-10 rounded-xl"
        />
        <Button
          type="button"
          onClick={add}
          className="rounded-xl bg-black hover:bg-black/85 text-white"
        >
          Add
        </Button>
      </div>
      <p className="mt-2 text-[12px] text-black/45">
        Optional. Drag chips to change the order customers see.
      </p>
      {value.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={value} strategy={horizontalListSortingStrategy}>
            <div className="flex flex-wrap gap-2 mt-3">
              {value.map((t) => (
                <TypeChip
                  key={t}
                  name={t}
                  onRemove={() => onChange(value.filter((x) => x !== t))}
                  onRename={(next) => {
                    const v = next.trim().replace(/\s+/g, " ");
                    if (!v) return;
                    if (value.some((x) => x.toLowerCase() === v.toLowerCase() && x !== t)) return;
                    onChange(value.map((x) => (x === t ? v : x)));
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function TypeChip({
  name,
  onRemove,
  onRename,
}: {
  name: string;
  onRemove: () => void;
  onRename: (next: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: name,
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  } as const;

  return (
    <span
      ref={setNodeRef}
      style={style}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white text-black/80 text-xs font-medium pl-1.5 pr-2 py-1"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-black/35 hover:text-black/70"
        aria-label="Reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {editing ? (
        <>
          <input
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onRename(draft);
                setEditing(false);
              }
              if (e.key === "Escape") {
                setDraft(name);
                setEditing(false);
              }
            }}
            className="w-28 bg-transparent outline-none border-b border-black/20 text-xs"
          />
          <button
            type="button"
            onClick={() => {
              onRename(draft);
              setEditing(false);
            }}
            className="text-black/50 hover:text-black"
            aria-label="Save type"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          {name}
          <button
            type="button"
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
            className="text-black/35 hover:text-black"
            aria-label="Edit type"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="text-black/35 hover:text-[#CF0A0A]"
        aria-label="Remove type"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
