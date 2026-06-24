import { writeFileSync } from "node:fs";
import mongoose from "mongoose";
import { config } from "@svc/access-management/infrastructure/config";
import { hashPassword } from "@svc/access-management/infrastructure/password";
import { TenantModel } from "@svc/access-management/domain/tenant/tenant.schema";
import { OrgUnitModel } from "@svc/access-management/domain/org_unit/org_unit.schema";
import { UserModel } from "@svc/access-management/domain/user/user.schema";
import { RoleModel } from "@svc/access-management/domain/role/role.schema";
import { DesignationModel } from "@svc/access-management/domain/designation/designation.schema";
import { AuditLogModel } from "@svc/access-management/domain/audit/audit_log.schema";
import { ExpenseModel } from "@svc/expense-service/domain/expense/expense.schema";
import { ExpenseWorkflowModel } from "@svc/expense-service/domain/expense_workflow/expense_workflow.schema";
import { computeChain } from "@svc/expense-service/domain/expense_workflow/compute_chain";
import { PayrollRecordModel } from "@svc/payroll-service/domain/payroll_record/payroll_record.schema";
import { ReportModel } from "@svc/reporting-service/domain/report/report.schema";
import type { Grant } from "@svc/access-management/domain/authorization/interface";

const PASSWORD = "password";
const g = (action: string, resourceType: string, condition: Grant["condition"]): Grant => ({
  action,
  resourceType,
  condition,
  maxAmount: null,
  denySelf: false,
});

async function run(): Promise<void> {
  await mongoose.connect(config.mongoUri);

  await ExpenseWorkflowModel.deleteMany({});
  await Promise.all([
    TenantModel.deleteMany({}), OrgUnitModel.deleteMany({}), RoleModel.deleteMany({}),
    UserModel.deleteMany({}), DesignationModel.deleteMany({}), ExpenseModel.deleteMany({}),
    PayrollRecordModel.deleteMany({}), ReportModel.deleteMany({}), AuditLogModel.deleteMany({}),
  ]);

  const pwd = await hashPassword(PASSWORD);

  // ---------- Tenant: Acme ----------
  const acme = await TenantModel.create({ name: "Acme Corp", slug: "acme" });

  // Designations = the approval matrix (approvalLimit null = unlimited).
  await DesignationModel.insertMany(
    [
      { key: "ceo", title: "Chief Executive Officer", level: 0, approvalLimit: null },
      { key: "md", title: "Managing Director", level: 0, approvalLimit: null },
      { key: "cfo", title: "Chief Financial Officer", level: 0, approvalLimit: null },
      { key: "cto", title: "Chief Technology Officer", level: 0, approvalLimit: null },
      { key: "director", title: "Director", level: 2, approvalLimit: 25000 },
      { key: "manager", title: "Manager", level: 3, approvalLimit: 5000 },
      { key: "lead", title: "Lead", level: 4, approvalLimit: 1000 },
      { key: "engineer", title: "Engineer", level: 5, approvalLimit: 0 },
      { key: "accountant", title: "Accountant", level: 5, approvalLimit: 0 },
      { key: "payroll_specialist", title: "Payroll Specialist", level: 5, approvalLimit: 0 },
      { key: "auditor", title: "Internal Auditor", level: 4, approvalLimit: 0 },
    ].map((d) => ({ ...d, tenantId: acme._id }))
  );

  // Org structure: company -> divisions -> departments.
  const company = await OrgUnitModel.create({ tenantId: acme._id, name: "Acme", type: "company", ancestors: [] });
  const div = async (name: string) =>
    OrgUnitModel.create({ tenantId: acme._id, name, type: "division", parentId: company._id, ancestors: [company._id] });
  const dept = async (name: string, parent: any) =>
    OrgUnitModel.create({ tenantId: acme._id, name, type: "department", parentId: parent._id, ancestors: [company._id, parent._id] });

  const executive = await div("Executive");
  const technology = await div("Technology");
  const finance = await div("Finance");
  const operations = await div("Operations");
  const platform = await dept("Platform Engineering", technology);
  const applications = await dept("Applications", technology);
  const accountsPayable = await dept("Accounts Payable", finance);
  const payrollDept = await dept("Payroll", finance);

  // Access roles — resource permissions only (approval authority lives in designations, not roles).
  const employee = await RoleModel.create({
    tenantId: acme._id, name: "Employee",
    grants: [g("expense:create", "expense", { type: "ownerOnly" }), g("expense:read", "expense", { type: "ownerOnly" }), g("payroll:read", "payroll", { type: "ownerOnly" })],
  });
  const financeAdmin = await RoleModel.create({
    tenantId: acme._id, name: "FinanceAdmin", parentRoleId: employee._id,
    grants: [g("expense:read", "expense", null)],
  });
  const payrollAdmin = await RoleModel.create({
    tenantId: acme._id, name: "PayrollAdmin",
    grants: [g("payroll:read", "payroll", null)],
  });
  const auditor = await RoleModel.create({
    tenantId: acme._id, name: "Auditor",
    grants: [g("expense:read", "expense", null), g("payroll:read", "payroll", null), g("report:read", "report", null), g("audit:read", "audit", null)],
  });
  const tenantAdmin = await RoleModel.create({
    tenantId: acme._id, name: "TenantAdmin",
    grants: [g("admin:*", "admin", null), g("audit:read", "audit", null)],
  });
  // Approval roles — carry the base expense:approve capability AND mark who may sign each workflow step.
  // Approval is a hybrid: holding one of these (base grant) + being the step's role are both required.
  const approveGrant = [g("expense:approve", "expense", null)];
  const expenseApprover = await RoleModel.create({ tenantId: acme._id, name: "ExpenseApprover", grants: approveGrant });
  const financeApprover = await RoleModel.create({ tenantId: acme._id, name: "FinanceApprover", grants: approveGrant });
  const execApprover = await RoleModel.create({ tenantId: acme._id, name: "ExecApprover", grants: approveGrant });

  // Users: designation + org unit + reporting line (managers created before their reports).
  const mk = (email: string, displayName: string, orgUnitId: any, designationKey: string, managerId: any, roleIds: any[]) =>
    UserModel.create({ tenantId: acme._id, email, passwordHash: pwd, displayName, orgUnitId, designationKey, managerId, roleIds });

  const alice = await mk("alice@acme.com", "Alice (CEO)", executive._id, "ceo", null, [tenantAdmin._id, execApprover._id]);
  const maya = await mk("maya@acme.com", "Maya (MD)", operations._id, "md", null, [employee._id]);
  const fiona = await mk("fiona@acme.com", "Fiona (CFO)", finance._id, "cfo", null, [financeAdmin._id, financeApprover._id, execApprover._id]);
  const tarun = await mk("tarun@acme.com", "Tarun (CTO)", technology._id, "cto", null, [employee._id]);
  const grace = await mk("grace@acme.com", "Grace (Finance Director)", finance._id, "director", fiona._id, [financeAdmin._id, expenseApprover._id, financeApprover._id]);
  const bob = await mk("bob@acme.com", "Bob (AP Manager)", accountsPayable._id, "manager", grace._id, [employee._id, expenseApprover._id]);
  const carol = await mk("carol@acme.com", "Carol (Accountant)", accountsPayable._id, "accountant", bob._id, [employee._id]);
  const pam = await mk("pam@acme.com", "Pam (Payroll Specialist)", payrollDept._id, "payroll_specialist", grace._id, [payrollAdmin._id]);
  const dan = await mk("dan@acme.com", "Dan (Eng Manager)", platform._id, "manager", tarun._id, [employee._id, expenseApprover._id]);
  const dave = await mk("dave@acme.com", "Dave (Engineer)", platform._id, "engineer", dan._id, [employee._id]);
  const gina = await mk("gina@acme.com", "Gina (Engineer)", applications._id, "engineer", tarun._id, [employee._id]);
  const ed = await mk("ed@acme.com", "Ed (Auditor)", executive._id, "auditor", alice._id, [auditor._id]);

  // Set unit heads now that users exist.
  const setHead = (unit: any, user: any) => OrgUnitModel.updateOne({ _id: unit._id }, { headUserId: user._id });
  await Promise.all([
    setHead(company, alice), setHead(executive, alice), setHead(technology, tarun), setHead(finance, fiona),
    setHead(operations, maya), setHead(platform, dan), setHead(applications, tarun), setHead(accountsPayable, bob), setHead(payrollDept, pam),
  ]);

  // Default expense approval workflow (configurable later in the UI): 3 role-based levels by amount.
  const steps = [
    { order: 1, name: "Manager review", minAmount: 0, roleId: String(expenseApprover._id), roleName: "ExpenseApprover" },
    { order: 2, name: "Finance review", minAmount: 5000, roleId: String(financeApprover._id), roleName: "FinanceApprover" },
    { order: 3, name: "Executive sign-off", minAmount: 25000, roleId: String(execApprover._id), roleName: "ExecApprover" },
  ];
  await ExpenseWorkflowModel.create({ tenantId: acme._id, steps });

  // Expenses pre-submitted (pending at step 0) so the approval inbox is populated on load.
  const submitExp = (owner: any, orgUnitId: any, amount: number) => {
    const chain = computeChain(steps, amount).map((s) => ({
      order: s.order, name: s.name, roleId: s.roleId, roleName: s.roleName, state: "pending", approverId: null,
    }));
    return ExpenseModel.create({ tenantId: acme._id, ownerId: owner._id, orgUnitId, amount, status: "pending", chain, currentStep: 0 });
  };
  const carolExp = await submitExp(carol, accountsPayable._id, 100);
  const carolBig = await submitExp(carol, accountsPayable._id, 9000);
  const carolHuge = await submitExp(carol, accountsPayable._id, 40000);
  const bobExp = await submitExp(bob, accountsPayable._id, 300);
  const ginaExp = await submitExp(gina, applications._id, 150);
  const daveExp = await submitExp(dave, platform._id, 200);

  const carolPayroll = await PayrollRecordModel.create({ tenantId: acme._id, ownerId: carol._id, orgUnitId: accountsPayable._id, grossPay: 5000 });
  const financeReport = await ReportModel.create({ tenantId: acme._id, ownerId: fiona._id, orgUnitId: finance._id, title: "Q2 Finance" });

  // ---------- Tenant: Globex (cross-tenant tests) ----------
  const globex = await TenantModel.create({ name: "Globex Inc", slug: "globex" });
  const globexRoot = await OrgUnitModel.create({ tenantId: globex._id, name: "Globex", type: "company", ancestors: [] });
  const globexEmployee = await RoleModel.create({
    tenantId: globex._id, name: "Employee",
    grants: [{ action: "expense:read", resourceType: "expense", condition: { type: "ownerOnly" }, maxAmount: null, denySelf: false }],
  });
  const evan = await UserModel.create({ tenantId: globex._id, email: "evan@globex.com", passwordHash: pwd, displayName: "Evan (Globex Employee)", orgUnitId: globexRoot._id, designationKey: null, managerId: null, roleIds: [globexEmployee._id] });
  const globexExpense = await ExpenseModel.create({ tenantId: globex._id, ownerId: evan._id, orgUnitId: globexRoot._id, amount: 999 });

  const u = (x: any, tenant: string) => ({ id: String(x._id), email: x.email, tenant });
  const fixtures = {
    password: PASSWORD,
    tenants: { acme: "acme", globex: "globex" },
    users: {
      alice: u(alice, "acme"), maya: u(maya, "acme"), fiona: u(fiona, "acme"), tarun: u(tarun, "acme"),
      grace: u(grace, "acme"), bob: u(bob, "acme"), carol: u(carol, "acme"), pam: u(pam, "acme"),
      dan: u(dan, "acme"), dave: u(dave, "acme"), gina: u(gina, "acme"), ed: u(ed, "acme"), evan: u(evan, "globex"),
    },
    roles: {
      employee: String(employee._id), payrollAdmin: String(payrollAdmin._id), auditor: String(auditor._id),
      expenseApprover: String(expenseApprover._id), financeApprover: String(financeApprover._id), execApprover: String(execApprover._id),
    },
    expenses: {
      carol: String(carolExp._id), carolBig: String(carolBig._id), carolHuge: String(carolHuge._id),
      bob: String(bobExp._id), gina: String(ginaExp._id), dave: String(daveExp._id), globex: String(globexExpense._id),
    },
    payroll: { carol: String(carolPayroll._id) },
    reports: { finance: String(financeReport._id) },
  };

  writeFileSync(new URL("../../seed-fixtures.json", import.meta.url), JSON.stringify(fixtures, null, 2));
  console.log("Seed complete. Tenants: acme, globex. Password for all users:", PASSWORD);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
