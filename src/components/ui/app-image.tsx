import type { ReactNode } from "react";

/**
 * AppImage — single standardized image renderer used across the admin panel
 * and the storefront.
 *
 * Rules (identical everywhere, only the container size changes):
 *  - fixed container supplied by the caller via `className`
 *  - image is always centred, both axes
 *  - object-fit: contain — never cropped, never zoomed, never stretched
 *  - balanced padding around the image
 */
export function AppImage({
  src,
  alt,
  className = "",
  padding = "p-3",
  bg = "bg-[#F7F7F7]",
  rounded = "",
  fallback,
  loading = "lazy",
  imgClassName = "",
}: {
  src?: string | null;
  alt: string;
  /** Fixed container size, e.g. "h-[140px] w-full" or "aspect-square w-full". */
  className?: string;
  padding?: string;
  bg?: string;
  rounded?: string;
  fallback?: ReactNode;
  loading?: "lazy" | "eager";
  imgClassName?: string;
}) {
  return (
    <div
      className={`grid place-items-center overflow-hidden ${bg} ${rounded} ${padding} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading={loading}
          className={`max-h-full max-w-full w-auto h-auto object-contain object-center ${imgClassName}`}
        />
      ) : (
        fallback ?? null
      )}
    </div>
  );
}
