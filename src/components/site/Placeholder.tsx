import type { ReactNode } from "react";

export function Placeholder({
  label,
  className = "",
  children,
  aspect = "aspect-[4/5]",
}: {
  label?: string;
  className?: string;
  children?: ReactNode;
  aspect?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-200 border border-black/5 ${aspect} ${className}`}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent 0 22px, rgba(0,0,0,0.04) 22px 23px)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        {children ?? (
          <span className="text-[10px] uppercase tracking-[0.3em] text-black/40 font-medium">
            {label ?? "Image"}
          </span>
        )}
      </div>
    </div>
  );
}
