import { useQuery } from "@tanstack/react-query";
import { myEmployeeContextQuery } from "@/lib/team-queries";

export function useEmployeeContext() {
  const q = useQuery(myEmployeeContextQuery());
  const permissions = new Set(q.data?.permissions ?? []);
  return {
    loading: q.isLoading,
    data: q.data,
    hasPermission: (key: string) => permissions.has(key),
    hasAny: (keys: string[]) => keys.length === 0 || keys.some((k) => permissions.has(k)),
  };
}
