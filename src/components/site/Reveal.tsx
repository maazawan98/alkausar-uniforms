import { useEffect, useRef, useState, type ReactNode } from "react";

type Variant = "up" | "left" | "right" | "zoom" | "fade";

const HIDDEN: Record<Variant, string> = {
  up: "opacity-0 translate-y-12",
  left: "opacity-0 -translate-x-6 sm:-translate-x-16",
  right: "opacity-0 translate-x-6 sm:translate-x-16",
  zoom: "opacity-0 scale-[1.08]",
  fade: "opacity-0",
};

export function useInView<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, seen };
}

export function Reveal({
  children,
  variant = "up",
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const { ref, seen } = useInView<HTMLDivElement>();

  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: `${delay}ms` }}
      className={`min-w-0 will-change-transform transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        seen ? "opacity-100 translate-x-0 translate-y-0 scale-100" : HIDDEN[variant]
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

export function Counter({
  to,
  suffix = "",
  duration = 1600,
  className = "",
}: {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const { ref, seen } = useInView<HTMLSpanElement>(0.4);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!seen) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, duration]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

/** Image frame with a subtle parallax-ish zoom reveal. */
export function RevealImage({
  src,
  alt,
  className = "",
  ratio = "aspect-[4/3]",
}: {
  src: string;
  alt: string;
  className?: string;
  ratio?: string;
}) {
  const { ref, seen } = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-[28px] bg-brand-black/5 ${ratio} ${className}`}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`h-full w-full object-cover transition-all duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          seen ? "scale-100 opacity-100 blur-0" : "scale-110 opacity-0 blur-sm"
        }`}
      />
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-black/10" />
    </div>
  );
}
