import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { countNewOrders } from "@/lib/admin-orders.functions";

const KEY = "admin:orders:last-seen";

function readSeen(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

/**
 * Unread-order indicator for the admin sidebar.
 * Counts orders created after the last time the Orders page was opened.
 */
export function useNewOrders(enabled = true) {
  const fn = useServerFn(countNewOrders);
  const [since, setSince] = useState<string | null>(null);

  useEffect(() => {
    let seen = readSeen();
    if (!seen) {
      seen = new Date().toISOString();
      window.localStorage.setItem(KEY, seen);
    }
    setSince(seen);
  }, []);

  const q = useQuery({
    queryKey: ["admin", "new-orders", since],
    queryFn: () => fn({ data: { since } }),
    enabled: enabled && since !== null,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  const markSeen = useCallback(() => {
    const stamp = q.data?.latest ?? new Date().toISOString();
    window.localStorage.setItem(KEY, stamp);
    setSince(stamp);
  }, [q.data?.latest]);

  return { count: q.data?.count ?? 0, markSeen };
}
