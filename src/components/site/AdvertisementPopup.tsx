import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { getActiveAdvertisement } from "@/lib/advertisements.functions";

const STORAGE_KEY = "aku-ad-last-shown";
const ONE_HOUR = 60 * 60 * 1000;

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

export function AdvertisementPopup() {
  const getAd = useServerFn(getActiveAdvertisement);
  const adQ = useQuery({
    queryKey: ["active-advertisement"],
    queryFn: () => getAd(),
    staleTime: 5 * 60 * 1000,
  });
  const ad = adQ.data ?? null;

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ad) return;
    try {
      const last = Number(localStorage.getItem(STORAGE_KEY) ?? "0");
      if (!last || Date.now() - last >= ONE_HOUR) {
        const t = setTimeout(() => setOpen(true), 400);
        return () => clearTimeout(t);
      }
    } catch {
      setOpen(true);
    }
  }, [ad]);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
    setOpen(false);
  };

  if (!ad || !open) return null;

  const link = ad.redirect_url?.trim() || null;
  const learnMore = () => {
    if (!link) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
    if (isExternal(link)) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = link;
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={ad.title || "Advertisement"}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={close}
      />
      <div className="relative w-full max-w-lg rounded-3xl bg-white overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <button
          type="button"
          onClick={close}
          aria-label="Close advertisement"
          className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-black/60 hover:bg-black text-white grid place-items-center transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        {ad.image_url && (
          <button
            type="button"
            onClick={link ? learnMore : close}
            className="block w-full text-left"
          >
            <img
              src={ad.image_url}
              alt={ad.title || "Advertisement"}
              className="w-full h-auto max-h-[70vh] object-cover bg-black/[0.04]"
            />
          </button>
        )}
        {(ad.title || ad.description || link) && (
          <div className="p-6 md:p-7">
            {ad.title && (
              <h3 className="text-xl md:text-2xl font-bold text-black tracking-tight">
                {ad.title}
              </h3>
            )}
            {ad.description && (
              <p className="mt-2 text-sm md:text-[15px] text-black/65 leading-relaxed">
                {ad.description}
              </p>
            )}
            {link && (
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full px-4 py-2 text-sm font-medium text-black/70 hover:bg-black/5 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={learnMore}
                  className="rounded-full bg-[#CF0A0A] hover:bg-[#DC5F00] transition-colors text-white text-sm font-semibold px-5 py-2.5"
                >
                  Learn More
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
