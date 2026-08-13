/* Tiny event bus so any component can open the global AccountModal
   that lives inside the site Header. */

type Listener = () => void;
const listeners = new Set<Listener>();

export function openAuthModal() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

export function subscribeAuthModal(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
