import { useRef, useState, useEffect } from "react";
import { Upload, X, RefreshCw } from "lucide-react";

export type ImageValue = {
  dataUrl: string;
  filename: string;
} | null;

export type DropzoneVariant = "logo" | "square" | "portrait";

const VARIANT_CONFIG: Record<
  DropzoneVariant,
  {
    accept: string;
    acceptRegex: RegExp;
    boxClass: string; // fixed pixel size
    fit: "contain" | "cover";
    padding: string;
    helper: { line1: string; line2: string; line3?: string };
  }
> = {
  logo: {
    accept: "image/png,image/jpeg,image/webp,image/svg+xml",
    acceptRegex: /^image\/(png|jpe?g|webp|svg\+xml)$/,
    boxClass:
      "w-[120px] h-[120px] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-6px_rgba(16,24,40,0.08)]",
    fit: "contain",
    padding: "p-2",
    helper: {
      line1: "Recommended: 512 × 512 px",
      line2: "PNG or WebP preferred · up to 5MB",
      line3: "Transparent background recommended",
    },
  },
  square: {
    accept: "image/png,image/jpeg,image/webp",
    acceptRegex: /^image\/(png|jpe?g|webp)$/,
    boxClass:
      "w-[120px] h-[120px] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-6px_rgba(16,24,40,0.08)]",
    fit: "contain",
    padding: "p-2",
    helper: {
      line1: "Recommended: 1200 × 1200 px",
      line2: "PNG, JPG or WebP · up to 5MB",
    },
  },
  portrait: {
    accept: "image/png,image/jpeg,image/webp",
    acceptRegex: /^image\/(png|jpe?g|webp)$/,
    boxClass: "w-[180px] h-[225px]", // 4:5
    fit: "contain",
    padding: "p-2",
    helper: {
      line1: "Recommended: 1200 × 1500 px (portrait 4:5)",
      line2: "JPG, PNG or WEBP · up to 5MB",
    },
  },
};

const MAX_BYTES = 5 * 1024 * 1024;

export function ImageDropzone({
  value,
  currentUrl,
  onChange,
  onRemoveExisting,
  label = "Click to upload image",
  variant = "logo",
  className = "",
}: {
  value: ImageValue;
  currentUrl?: string | null;
  onChange: (v: ImageValue) => void;
  onRemoveExisting?: () => void;
  label?: string;
  variant?: DropzoneVariant;
  className?: string;
}) {
  const cfg = VARIANT_CONFIG[variant];
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value) setPreview(value.dataUrl);
    else setPreview(currentUrl ?? null);
  }, [value, currentUrl]);

  const handleFile = (file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("Image must be under 5MB");
      return;
    }
    if (!cfg.acceptRegex.test(file.type)) {
      setError(
        variant === "logo"
          ? "Only PNG, JPG, WEBP or SVG"
          : "Only JPG, PNG or WEBP",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ dataUrl: reader.result as string, filename: file.name });
    };
    reader.readAsDataURL(file);
  };

  const openPicker = () => inputRef.current?.click();
  const removeImage = () => {
    if (value) onChange(null);
    else onRemoveExisting?.();
    setPreview(null);
  };

  const helperText = (
    <div className="text-[11px] text-black/50 leading-relaxed">
      {cfg.helper.line1}
      <br />
      {cfg.helper.line2}
      {cfg.helper.line3 && (
        <>
          <br />
          {cfg.helper.line3}
        </>
      )}
    </div>
  );

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={cfg.accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {preview ? (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div
            className={`shrink-0 rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden flex items-center justify-center ${cfg.boxClass}`}
          >
            <img
              src={preview}
              alt="Preview"
              className={`${cfg.fit === "contain" ? "max-w-full max-h-full object-contain" : "w-full h-full object-cover"} ${cfg.padding}`}
              style={{ objectPosition: "center" }}
            />
          </div>
          <div className="flex-1 w-full flex flex-col items-center sm:items-start gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openPicker}
                className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] bg-white hover:border-black/30 hover:bg-[#F9FAFB] text-black/80 px-3 py-1.5 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Replace Image
              </button>
              <button
                type="button"
                onClick={removeImage}
                className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg border border-[#CF0A0A]/20 bg-white hover:bg-[#CF0A0A] hover:text-white text-[#CF0A0A] px-3 py-1.5 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Remove Image
              </button>
            </div>
            {helperText}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          className={`w-full rounded-2xl border-2 border-dashed border-[#E5E7EB] hover:border-[#CF0A0A] hover:bg-[#CF0A0A]/[0.02] transition-all p-6 text-center flex flex-col items-center justify-center gap-2`}
        >
          <Upload className="h-6 w-6 text-black/40" />
          <p className="text-sm font-medium text-black/70">{label}</p>
          {helperText}
        </button>
      )}
      {error && <p className="text-xs text-[#CF0A0A] mt-2">{error}</p>}
    </div>
  );
}
