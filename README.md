# Access Management & Expense Approval — POC

A multi-tenant **access-control platform** plus an **expense-management service** with **configurable,
multi-level approval workflows** — and a web **console to test it all live**.

The design separates two things cleanly:

- **access-management** (the core) is a central **Policy Decision Point (PDP)**: identity/login, roles &
  permissions (RBAC), attribute conditions (ABAC), tenant isolation, the approval primitive, and an audit log.
- Three business services — **expense / payroll / reporting** — are thin **PEPs** (Policy Enforcement
  Points). They own their data and *delegate every access decision* to the PDP. The expense service also
  owns the **configurable approval workflow**.

A React app (`apps/ui`) lets you act as any seeded user and watch decisions happen in real time.

---

## Contents
1. [Run it on your machine](#1-run-it-on-your-machine)
2. [Using the UI to test scenarios](#2-using-the-ui-to-test-scenarios)
3. [How the system works](#3-how-the-system-works)
4. [Seeded data reference](#4-seeded-data-reference)
5. [Project structure](#5-project-structure)
6. [What the automated demo proves](#6-what-the-automated-demo-proves)

---

## 1. Run it on your machine

**Prerequisites**
- **Node.js 20+** (works on 20–26).
- **MongoDB on `localhost:27017`** — either Docker (`docker compose up -d`, uses `mongo:7`) **or** a local `mongod`. No auth required.

**Steps** (from the project root)

```bash
# 1. install dependencies (backend + UI)
npm run install:all

# 2. start MongoDB  (skip if you already run a local mongod on :27017)
docker compose up -d

# 3. seed demo data (2 tenants, org chart, roles, users, a workflow, sample expenses)
npm run seed

# 4. start the backend services  (terminal 1) — core :4000, expense :4001, payroll :4002, reporting :4003
npm run dev

# 5. start the UI  (terminal 2)
npm run ui            # → http://localhost:5173
```

Open **http://localhost:5173** and click any user under **“Acting as”** (no password needed — the UI logs
you in for the demo; all seeded passwords are `password` if you call the API directly).

**Optional — see it pass end-to-end in the terminal:**

```bash
npm run demo          # runs 11 scenarios (16 checks) against the live services
```

> Re-run `npm run seed` any time to reset to a clean state (the demo and your clicking mutate data).
> Everything works on defaults — no `.env` needed. Override via env vars if you like: `MONGO_URI`,
> `JWT_SECRET`, `SERVICE_TOKEN`, `CORE_PORT` / `EXPENSE_PORT` / `PAYROLL_PORT` / `REPORTING_PORT`, `PDP_URL`.

---

## 2. Using the UI to test scenarios

The console has a left **“Acting as”** rail (pick who you are) and five tabs. Switching user re-fires the
current view as that person — that's the core idea: *same action, different user, different decision.*

### Scenario Tester
Fire a single action and see the verdict. Pick an **Action** (`expense:read`, `expense:approve`,
`payroll:read`, …) and a **Resource**, then **Run**. A coloured banner shows **ALLOW / DENY** and the
PDP's exact reason; the history table logs every attempt.

**Quick-scenario buttons** replay the headline cases in one click (they switch user + action + resource for you):
- *Manager approves report (allow)* — Bob signs a $100 expense.
- *Over Manager limit / Director clears it / CFO approves any amount* — watch the same expense need a higher approver as the amount grows.
- *Outside reporting line (deny)*, *Self-approval blocked (deny)*, *Payroll need-to-know (deny)*, *Cross-tenant read (deny)*.

### Expenses
The real expense lifecycle.
- **My expenses** — create a draft (enter an amount → *Create draft*), then **Submit** it. On submit it
  snapshots the approval chain for that amount.
- **Awaiting my approval** — the inbox of expenses you can sign *right now* (you hold the current step's
  role and you're not the owner). **Approve** advances it to the next level; **Reject** ends it.
- The **approval chain** is shown as a stepper: ✓ green = signed (with who signed), violet = current step,
  grey = upcoming. Switch users to watch an expense move up the levels.

*Try this:* act as **Carol**, submit a $9,000 expense. Switch to **Bob** (ExpenseApprover) → approve it →
it advances to the Finance step. Switch to **Fiona** (FinanceApprover) → approve → it's done.

### Workflow
Configure the approval steps (admin-gated — act as **Alice**, the TenantAdmin). Each step has a **name**,
an **amount threshold** (applies when amount ≥ it), and a **required role**. Add / reorder / remove steps,
then **Save**. New submissions use the new chain immediately. (Try saving as a non-admin like Bob — denied.)

### Role Admin
Assign / revoke a user's roles (act as **Alice**). Changes take effect on the **very next** decision —
revoke a role, then re-run a Scenario Tester action as that user and watch it flip to DENY.

### Audit Log
Every decision the PDP made — subject, action, resource, ALLOW/DENY, and reason. Filter by decision.
(Readable by an admin or the **Auditor**, Ed.)

---

## 3. How the system works

### Authentication vs authorization
- **Login** (`POST /auth/login` on the core) verifies tenant + email + bcrypt password and returns a
  **signed JWT** carrying *identity only* — `sub`, `tenantId`, `orgUnitId`, `email`. No permissions live in
  the token.
- **Every request** to a PEP is authorized *separately and live*: the PEP validates the token (identity),
  loads the resource, and asks the PDP `POST /authz/check`. The PDP re-reads the user's roles from the DB
  at decision time, so role changes apply on the next request and a stale token never grants stale access.

### The access model — a pragmatic hybrid (RBAC + ABAC + workflow)
The PDP routes by action:

- **Read / create / payroll / report / admin / audit → RBAC + ABAC.**
  Tenant gate first (subject tenant must equal resource tenant) → does any of the subject's roles (with
  single-parent **inheritance**) grant the action? → does the grant's **ABAC condition** hold
  (`ownerOnly`, `sameOrgUnit`, `inOrgSubtree`)? Fail-closed; every decision audited.

- **`expense:approve` → a HYBRID gate (both must pass).**
  1. **Workflow step** — the expense service's configured step says which **role** signs the current
     level; the subject must hold it, must not be the owner (**separation of duties**), same tenant.
  2. **Base permission** — the subject's roles must also carry a base `expense:approve` grant.
  This stops an admin from handing approval power to a role just by naming it in the workflow — that role
  must also hold the base capability.

Crucially, the decision trusts only the **signed token** (identity) and **server-derived resource
attributes** (the PEP loads the record from its DB). The client supplies just an opaque id, so it can't
forge ownership, tenant, or the required step role.

### Configurable expense workflow
Per tenant, an ordered list of steps `{ name, minAmount, role }`. A submitted expense's **chain** = the
steps whose threshold it meets, in order — so a small expense clears one level and a large one routes
through several. The chain is **snapshotted at submit**; approving advances `currentStep` until done.
Owned and configured by **expense-service**; the role list comes from access-management's `/directory`,
and each approval decision is the PDP's call.

### Hierarchies (the organization)
Three independent structures, kept separate:
- **Org tree** — `orgUnit.type` ∈ company / division / department / team, each with a `headUserId`. The
  whole company in one tree (Acme → C-suite-owned divisions → departments).
- **Reporting line** — `user.managerId` (who reports to whom).
- **Role hierarchy** — `role.parentRoleId`; permissions inherit down.

Designations (CEO, Manager, Engineer…) are descriptive titles on each user. The C-suite (CEO/MD/CFO/CTO)
sit at the same level under the company root, each heading a division.

### Data model (collections)
- **access-management owns:** `tenant`, `orgUnit`, `designation`, `role` (inheritance + embedded grants),
  `user` (with `managerId`, `designationKey`), `auditLog`.
- **each PEP owns its own data:** expense-service → `expense` (stateful: status + chain + currentStep) and
  `expenseWorkflow` (config); payroll-service → `payrollRecord`; reporting-service → `report`.

### policyVersion (dynamic changes)
A per-tenant counter bumped on every role/grant/assignment change. The PDP caches compiled roles keyed by
`(tenant, policyVersion)`, so a change busts the cache and is honored on the next decision — no restart.

---

## 4. Seeded data reference

**Acme org** (all passwords `password`). C-suite are peers under the company root.

| User | Designation | Division / Dept | Reports to | Roles held |
|---|---|---|---|---|
| alice@acme.com | CEO | Executive | — | TenantAdmin, **ExecApprover** |
| maya@acme.com | MD | Operations | — | Employee |
| fiona@acme.com | CFO | Finance | — | FinanceAdmin, **FinanceApprover, ExecApprover** |
| tarun@acme.com | CTO | Technology | — | Employee |
| grace@acme.com | Director | Finance | fiona | FinanceAdmin, **ExpenseApprover, FinanceApprover** |
| bob@acme.com | Manager | Accounts Payable | grace | Employee, **ExpenseApprover** |
| carol@acme.com | Accountant | Accounts Payable | bob | Employee |
| pam@acme.com | Payroll Specialist | Payroll | grace | PayrollAdmin |
| dan@acme.com | Manager | Platform Engineering | tarun | Employee, **ExpenseApprover** |
| dave@acme.com | Engineer | Platform Engineering | dan | Employee |
| gina@acme.com | Engineer | Applications | tarun | Employee |
| ed@acme.com | Internal Auditor | Executive | alice | Auditor |

`evan@globex.com` lives in a second tenant (**Globex**) for cross-tenant tests.

**Roles & grants**
- `Employee` — `expense:create`, `expense:read`, `payroll:read` (all **ownerOnly**)
- `FinanceAdmin` (inherits Employee) — `expense:read` (any)
- `PayrollAdmin` — `payroll:read` (any)
- `Auditor` — read any on expense / payroll / report / audit
- `TenantAdmin` — `admin:*`, `audit:read`
- `ExpenseApprover` / `FinanceApprover` / `ExecApprover` — carry the base `expense:approve` grant and gate the workflow steps

**Default expense workflow**
1. Manager review — amount ≥ $0 — **ExpenseApprover**
2. Finance review — amount ≥ $5,000 — **FinanceApprover**
3. Executive sign-off — amount ≥ $25,000 — **ExecApprover**

---

## 5. Project structure

DDD layout: `application/` orchestrates use cases, `domain/` holds models + logic + per-collection data
access (`*_dml.ts`, one collection each), `infrastructure/` is config/db/jwt, `interface/http/` is the
transport. **Rule: application → domain, never the reverse.** Files are `snake_case`.

```
src/
  contracts/                 shared kernel — authz request/response + token claims
  pep-sdk/                   PEP toolkit: createPdpClient, createAuthenticate, enforce
  services/
    access-management/       ★ the PDP/core
      domain/                authorization (pure RBAC evaluator), approval_workflow (pure step rule),
                             tenant, user, org_unit, designation, role (+ get_effective_grants cache), audit
      application/           login, check_access, authorize_action, manage_roles, get_audit_trail, directory
      infrastructure/        config, connection, jwt, password
      interface/http/        server, middleware, routes/{auth,authz,admin,audit,directory}
    expense-service/         PEP — owns expenses + the workflow
      domain/expense/        stateful expense (status, chain, currentStep)
      domain/expense_workflow/ config + computeChain
      domain/access_control/ wraps the PDP client
      application/           create/submit/approve/reject/list_my/inbox + workflow get/update
    payroll-service/         PEP (domain/payroll_record + access_control)
    reporting-service/       PEP (domain/report + access_control)
tools/  seed/  demo/         dev harness
apps/   ui/                  React console (Vite)
```

---

## 6. What the automated demo proves

`npm run demo` runs 11 scenarios against the live services:

1. The workflow is configured (3 role-based levels).
2. **Single-level approval** — a $100 expense needs only Manager review.
3. **Wrong role for the step** — a FinanceApprover can't sign the Manager step.
4. **Multi-level routing** — a $9,000 expense routes Manager → Finance.
5. **Separation of duties** — nobody approves their own; another approver can.
6. **Non-approver denied.**
7. **Reject** ends the flow.
8. **Approvals inbox** lists exactly what you can sign (excludes your own).
9. **Configure workflow** — admin-only; persisted; non-admin denied.
10. **Hybrid gate** — a holder of the step's role but lacking the base `expense:approve` grant is denied.
11. **Tenant isolation** + a populated **audit trail**.

> Note: unit tests are scaffolded as a TODO under `test/` (the design keeps the policy evaluators pure and
> easily unit-testable); end-to-end behavior is currently verified by `npm run demo`.
