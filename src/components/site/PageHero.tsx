import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative bg-brand-black text-white pt-40 pb-24 overflow-hidden">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(207,10,10,0.35), transparent 55%), radial-gradient(ellipse at bottom left, rgba(220,95,0,0.25), transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <nav className="text-xs uppercase tracking-[0.25em] text-white/50 mb-8">
          <Link to="/" className="hover:text-brand-orange">Home</Link>
          <span className="mx-3">/</span>
          <span className="text-white/80">{eyebrow ?? title}</span>
        </nav>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold max-w-4xl leading-[1.05]">{title}</h1>
        {description && (
          <p className="mt-6 max-w-2xl text-base md:text-lg text-white/70 leading-relaxed">
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
