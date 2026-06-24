const BASE = {
  core: "http://localhost:4000", // access-management: auth, authz/admin, audit, directory
  expense: "http://localhost:4001",
  payroll: "http://localhost:4002",
  reporting: "http://localhost:4003",
} as const;

export interface CatalogUser {
  id: string;
  displayName: string;
  email: string;
  tenantSlug: string;
  orgName: string;
  designation: string | null;
  managerName: string | null;
  roleNames: string[];
}
export interface CatalogResource {
  id: string;
  label: string;
  tenantSlug: string;
  status?: string;
}
export interface CatalogRole {
  id: string;
  name: string;
  tenantSlug: string;
}
export interface Catalog {
  tenants: { id: string; name: string; slug: string }[];
  roles: CatalogRole[];
  users: CatalogUser[];
  expenses: CatalogResource[];
  payroll: CatalogResource[];
  reports: CatalogResource[];
}

export interface CallResult {
  status: number;
  json: any;
}

interface Directory {
  tenants: { id: string; name: string; slug: string }[];
  orgUnits: { id: string; name: string; tenantSlug: string }[];
  roles: CatalogRole[];
  users: CatalogUser[];
}

/** Aggregate the identity directory (core) with each business service's resource catalog. */
export async function getCatalog(): Promise<Catalog> {
  const [dir, expensesRaw, payrollRaw, reportsRaw] = await Promise.all([
    fetch(`${BASE.core}/directory`).then((r) => r.json() as Promise<Directory>),
    fetch(`${BASE.expense}/catalog`).then((r) => r.json()),
    fetch(`${BASE.payroll}/catalog`).then((r) => r.json()),
    fetch(`${BASE.reporting}/catalog`).then((r) => r.json()),
  ]);

  const tenantSlug = new Map(dir.tenants.map((t) => [t.id, t.slug]));
  const userName = new Map(dir.users.map((u) => [u.id, u.displayName]));
  const orgName = new Map(dir.orgUnits.map((o) => [o.id, o.name]));
  const slug = (tenantId: string) => tenantSlug.get(tenantId) ?? "?";
  const who = (ownerId: string) => userName.get(ownerId) ?? "?";
  const org = (orgUnitId: string) => orgName.get(orgUnitId) ?? "?";

  return {
    tenants: dir.tenants,
    roles: dir.roles,
    users: dir.users,
    expenses: (expensesRaw as any[]).map((e) => ({
      id: e.id,
      tenantSlug: slug(e.tenantId),
      status: e.status,
      label: `$${e.amount} · ${who(e.ownerId)} · ${org(e.orgUnitId)}`,
    })),
    payroll: (payrollRaw as any[]).map((p) => ({
      id: p.id,
      tenantSlug: slug(p.tenantId),
      label: `$${p.grossPay} · ${who(p.ownerId)} · ${org(p.orgUnitId)}`,
    })),
    reports: (reportsRaw as any[]).map((r) => ({
      id: r.id,
      tenantSlug: slug(r.tenantId),
      label: `${r.title} · ${org(r.orgUnitId)}`,
    })),
  };
}

export async function login(tenantSlug: string, email: string, password = "password"): Promise<string> {
  const res = await fetch(`${BASE.core}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenantSlug, email, password }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  return ((await res.json()) as { token: string }).token;
}

async function call(token: string, method: string, url: string, body?: unknown): Promise<CallResult> {
  const res = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, json };
}

/** Action map: human label -> the real PEP call it triggers. */
export const ACTIONS = {
  "expense:read": { kind: "expense", run: (t: string, id: string) => call(t, "GET", `${BASE.expense}/expenses/${id}`) },
  "expense:approve": { kind: "expense", run: (t: string, id: string) => call(t, "POST", `${BASE.expense}/expenses/${id}/approve`) },
  "expense:create": { kind: "none", run: (t: string, _id: string, amount = 50) => call(t, "POST", `${BASE.expense}/expenses`, { amount }) },
  "payroll:read": { kind: "payroll", run: (t: string, id: string) => call(t, "GET", `${BASE.payroll}/payroll/${id}`) },
  "report:read": { kind: "report", run: (t: string, id: string) => call(t, "GET", `${BASE.reporting}/reports/${id}`) },
} as const;

export type ActionKey = keyof typeof ACTIONS;

export const adminApi = {
  assignRole: (token: string, userId: string, roleId: string) =>
    call(token, "POST", `${BASE.core}/admin/users/${userId}/roles`, { roleId }),
  revokeRole: (token: string, userId: string, roleId: string) =>
    call(token, "DELETE", `${BASE.core}/admin/users/${userId}/roles/${roleId}`),
  audit: (token: string, decision?: string) =>
    call(token, "GET", `${BASE.core}/audit${decision ? `?decision=${decision}` : ""}`),
};

export interface WorkflowStep {
  order?: number;
  name: string;
  minAmount: number;
  roleId: string;
  roleName: string;
}
export interface ChainStep {
  order: number;
  name: string;
  roleId: string;
  roleName: string;
  state: "pending" | "approved";
  approverId: string | null;
}
export interface Expense {
  id: string;
  ownerId: string;
  amount: number;
  status: "draft" | "pending" | "approved" | "rejected";
  chain: ChainStep[];
  currentStep: number;
}

export const expenseApi = {
  getWorkflow: (t: string) => call(t, "GET", `${BASE.expense}/workflow`),
  putWorkflow: (t: string, steps: WorkflowStep[]) => call(t, "PUT", `${BASE.expense}/workflow`, { steps }),
  create: (t: string, amount: number) => call(t, "POST", `${BASE.expense}/expenses`, { amount }),
  submit: (t: string, id: string) => call(t, "POST", `${BASE.expense}/expenses/${id}/submit`),
  approve: (t: string, id: string) => call(t, "POST", `${BASE.expense}/expenses/${id}/approve`),
  reject: (t: string, id: string) => call(t, "POST", `${BASE.expense}/expenses/${id}/reject`),
  mine: (t: string) => call(t, "GET", `${BASE.expense}/expenses/mine`),
  inbox: (t: string) => call(t, "GET", `${BASE.expense}/expenses/inbox`),
};
