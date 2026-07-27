import { queryOptions } from "@tanstack/react-query";
import {
  listRolesAndPermissions,
  listEmployees,
  listEmployeeAuditLogs,
  getEmployeePermissions,
  getMyEmployeeContext,
} from "@/lib/team.functions";

export const rolesAndPermsQuery = (enabled = true) =>
  queryOptions({
    queryKey: ["team", "catalog"],
    queryFn: () => listRolesAndPermissions(),
    staleTime: 5 * 60_000,
    enabled,
    retry: false,
  });

export const employeesQuery = (enabled = true) =>
  queryOptions({
    queryKey: ["team", "employees"],
    queryFn: () => listEmployees(),
    enabled,
    retry: false,
  });

export const employeePermsQuery = (employeeId: string | null) =>
  queryOptions({
    queryKey: ["team", "employee-perms", employeeId],
    enabled: !!employeeId,
    queryFn: () =>
      employeeId
        ? getEmployeePermissions({ data: { employee_id: employeeId } })
        : Promise.resolve([]),
  });

export const teamAuditLogsQuery = (enabled = true) =>
  queryOptions({
    queryKey: ["team", "audit"],
    queryFn: () => listEmployeeAuditLogs(),
    enabled,
    retry: false,
  });

export const myEmployeeContextQuery = (enabled = true) =>
  queryOptions({
    queryKey: ["me", "employee-context"],
    queryFn: () => getMyEmployeeContext(),
    enabled,
    retry: false,
  });
