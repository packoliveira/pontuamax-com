import { queryOptions } from "@tanstack/react-query";
import {
  listRolesAndPermissions,
  listEmployees,
  listEmployeeAuditLogs,
  getEmployeePermissions,
  getMyEmployeeContext,
} from "@/lib/team.functions";

export const rolesAndPermsQuery = () =>
  queryOptions({
    queryKey: ["team", "catalog"],
    queryFn: () => listRolesAndPermissions(),
    staleTime: 5 * 60_000,
  });

export const employeesQuery = () =>
  queryOptions({
    queryKey: ["team", "employees"],
    queryFn: () => listEmployees(),
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

export const teamAuditLogsQuery = () =>
  queryOptions({
    queryKey: ["team", "audit"],
    queryFn: () => listEmployeeAuditLogs(),
  });

export const myEmployeeContextQuery = () =>
  queryOptions({
    queryKey: ["me", "employee-context"],
    queryFn: () => getMyEmployeeContext(),
  });
