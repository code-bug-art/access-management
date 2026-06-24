import { readFileSync } from "node:fs";

interface FxUser { id: string; email: string; tenant: string }
type UserKey = "alice" | "maya" | "fiona" | "tarun" | "grace" | "bob" | "carol" | "pam" | "dan" | "dave" | "gina" | "ed" | "evan";
interface Fixtures {
  password: string;
  users: Record<UserKey, FxUser>;
  roles: { employee: string; payrollAdmin: string; auditor: string; expenseApprover: string; financeApprover: string; execApprover: string };
  expenses: { carol: string; carolBig: string; carolHuge: string; bob: string; gina: string; dave: string; globex: string };
}

const fx = JSON.parse(readFileSync(new URL("../../seed-fixtures.json", import.meta.url), "utf8")) as Fixtures;
const URLS = { core: "http://localhost:4000", expense: "http://localhost:4001" };
let pass = 0;
let fail = 0;

async function login(userKey: UserKey): Promise<string> {
  const u = fx.users[userKey];
  const res = await fetch(`${URLS.core}/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenantSlug: u.tenant, email: u.email, password: fx.password }),
  });
  if (!res.ok) throw new Error(`login failed for ${userKey}: ${res.status}`);
  return ((await res.json()) as { token: string }).token;
}
async function call(token: string, method: string, url: string, body?: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(url, {
    method, headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* none */ }
  return { status: res.status, json };
}
const reason = (r: { json: any }) => r.json?._authz?.reason ?? r.json?.reason ?? r.json?.error ?? "";
function check(name: string, ok: boolean, detail: string): void {
  if (ok) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${name} — ${detail}`); }
  else { fail++; console.log(`  \x1b[31m✗\x1b[0m ${name} — ${detail}`); }
}
const approve = (tok: string, id: string) => call(tok, "POST", `${URLS.expense}/expenses/${id}/approve`);
const reject = (tok: string, id: string) => call(tok, "POST", `${URLS.expense}/expenses/${id}/reject`);

async function main(): Promise<void> {
  console.log("\n=== Expense Management — configurable multi-level approval workflow ===\n");
  const [alice, fiona, bob, carol, dan, dave] = await Promise.all([
    login("alice"), login("fiona"), login("bob"), login("carol"), login("dan"), login("dave"),
  ]);

  console.log("Scenario 1 — Workflow is configured (3 role-based levels)");
  {
    const r = await call(bob, "GET", `${URLS.expense}/workflow`);
    check("GET /workflow returns the configured steps", r.status === 200 && r.json?.steps?.length === 3, `${r.json?.steps?.length} steps`);
  }

  console.log("Scenario 2 — Single-level approval ($100 needs only Manager review)");
  {
    const r = await approve(bob, fx.expenses.carol);
    check("bob (ExpenseApprover) approves carol's $100 -> approved", r.status === 200 && r.json?.status === "approved", `${r.status} status=${r.json?.status}`);
  }

  console.log("Scenario 3 — Wrong role for the current step");
  {
    const r = await approve(fiona, fx.expenses.carolBig);
    check("fiona can't sign step 1 (needs ExpenseApprover, she's FinanceApprover)", r.status === 403 && /ExpenseApprover/.test(reason(r)), `${r.status} ${reason(r)}`);
  }

  console.log("Scenario 4 — Multi-level: $9,000 routes Manager -> Finance");
  {
    const s1 = await approve(bob, fx.expenses.carolBig);
    check("step 1: bob approves -> still pending at step 2", s1.status === 200 && s1.json?.status === "pending" && s1.json?.currentStep === 1, `status=${s1.json?.status} step=${s1.json?.currentStep}`);
    const s2 = await approve(fiona, fx.expenses.carolBig);
    check("step 2: fiona (FinanceApprover) approves -> approved", s2.status === 200 && s2.json?.status === "approved", `status=${s2.json?.status}`);
  }

  console.log("Scenario 5 — Separation of duties");
  {
    const self = await approve(bob, fx.expenses.bob);
    check("bob can't approve his OWN expense", self.status === 403 && /separation of duties/.test(reason(self)), `${self.status} ${reason(self)}`);
    const other = await approve(dan, fx.expenses.bob);
    check("dan (another ExpenseApprover) approves bob's expense", other.status === 200, `${other.status}`);
  }

  console.log("Scenario 6 — Non-approver is denied");
  {
    const r = await approve(carol, fx.expenses.dave);
    check("carol (no approval role) can't approve", r.status === 403 && /ExpenseApprover/.test(reason(r)), `${r.status} ${reason(r)}`);
  }

  console.log("Scenario 7 — Reject");
  {
    const r = await reject(dan, fx.expenses.gina);
    check("dan rejects gina's expense", r.status === 200 && r.json?.status === "rejected", `status=${r.json?.status}`);
  }

  console.log("Scenario 8 — Approvals inbox");
  {
    const r = await call(bob, "GET", `${URLS.expense}/expenses/inbox`);
    const items = Array.isArray(r.json) ? r.json : [];
    const ownNone = items.every((e: any) => e.ownerId !== fx.users.bob.id);
    check("bob's inbox lists expenses he can sign now (excludes his own)", r.status === 200 && items.length > 0 && ownNone, `${items.length} item(s)`);
  }

  console.log("Scenario 9 — Configure the workflow (admin only)");
  {
    const denied = await call(bob, "PUT", `${URLS.expense}/workflow`, { steps: [] });
    check("non-admin bob cannot reconfigure the workflow", denied.status === 403, `${denied.status} ${reason(denied)}`);
    const newSteps = [
      { name: "Manager review", minAmount: 0, roleId: fx.roles.expenseApprover, roleName: "ExpenseApprover" },
      { name: "Finance review", minAmount: 1000, roleId: fx.roles.financeApprover, roleName: "FinanceApprover" },
    ];
    const ok = await call(alice, "PUT", `${URLS.expense}/workflow`, { steps: newSteps });
    check("admin alice reconfigures to 2 levels (finance from $1,000)", ok.status === 200 && ok.json?.steps?.length === 2, `${ok.json?.steps?.length} steps`);
    const after = await call(alice, "GET", `${URLS.expense}/workflow`);
    check("the new config is persisted", after.json?.steps?.[1]?.minAmount === 1000, `finance minAmount=${after.json?.steps?.[1]?.minAmount}`);
  }

  console.log("Scenario 10 — Hybrid gate: workflow step AND base expense:approve grant");
  {
    // Point step 1 at the Employee role (everyone holds it, but it has no expense:approve grant).
    await call(alice, "PUT", `${URLS.expense}/workflow`, {
      steps: [{ name: "Anyone review", minAmount: 0, roleId: fx.roles.employee, roleName: "Employee" }],
    });
    const created = await call(carol, "POST", `${URLS.expense}/expenses`, { amount: 50 });
    await call(carol, "POST", `${URLS.expense}/expenses/${created.json.id}/submit`);
    const r = await call(dave, "POST", `${URLS.expense}/expenses/${created.json.id}/approve`);
    check("dave holds the Employee step role but is denied (no expense:approve grant)", r.status === 403 && /expense:approve permission/.test(reason(r)), `${r.status} ${reason(r)}`);
    // Restore the default 3-step workflow.
    await call(alice, "PUT", `${URLS.expense}/workflow`, {
      steps: [
        { name: "Manager review", minAmount: 0, roleId: fx.roles.expenseApprover, roleName: "ExpenseApprover" },
        { name: "Finance review", minAmount: 5000, roleId: fx.roles.financeApprover, roleName: "FinanceApprover" },
        { name: "Executive sign-off", minAmount: 25000, roleId: fx.roles.execApprover, roleName: "ExecApprover" },
      ],
    });
  }

  console.log("Scenario 11 — Tenant isolation + audit");
  {
    const x = await call(carol, "GET", `${URLS.expense}/expenses/${fx.expenses.globex}`);
    check("carol(acme) cannot read globex expense", x.status === 403 && /cross-tenant/.test(reason(x)), `${x.status} ${reason(x)}`);
    const audit = await call(alice, "GET", `${URLS.core}/audit`);
    const entries = Array.isArray(audit.json) ? audit.json : [];
    check("audit captured decisions (with denies)", audit.status === 200 && entries.some((e: any) => e.decision === "DENY"), `${entries.length} entries`);
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
