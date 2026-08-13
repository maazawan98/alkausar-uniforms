import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminSession, type AdminSessionInfo } from "@/lib/admin-auth.functions";

export const ADMIN_SESSION_KEY = ["admin-session"] as const;

export function useAdminSession() {
  const fetchSession = useServerFn(getAdminSession);
  return useQuery<AdminSessionInfo | null>({
    queryKey: ADMIN_SESSION_KEY,
    queryFn: async () => (await fetchSession()) ?? null,
    staleTime: 60_000,
  });
}

export function useSetAdminSession() {
  const qc = useQueryClient();
  return {
    set: (session: AdminSessionInfo | null) =>
      qc.setQueryData(ADMIN_SESSION_KEY, session),
    invalidate: () => qc.invalidateQueries({ queryKey: ADMIN_SESSION_KEY }),
  };
}
