import { useQuery } from "@tanstack/react-query";
import { myEmployeeContextQuery } from "@/lib/team-queries";
import { useHasSession } from "@/hooks/use-has-session";

export function useEmployeeContext() {
  const hasSession = useHasSession() === true;
  const q = useQuery(myEmployeeContextQuery(hasSession));
  const permissions = new Set(q.data?.permissions ?? []);
  return {
    loading: !hasSession || q.isLoading,
    data: q.data,
    hasPermission: (key: string) => permissions.has(key),
    hasAny: (keys: string[]) => keys.length === 0 || keys.some((k) => permissions.has(k)),
  };
}
