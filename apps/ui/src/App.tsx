import { useEffect, useMemo, useState } from "react";
import {
  ACTIONS,
  adminApi,
  expenseApi,
  getCatalog,
  login,
  type ActionKey,
  type Catalog,
  type CallResult,
  type CatalogResource,
  type CatalogUser,
  type Expense,
  type WorkflowStep,
} from "./api";

interface Acting {
  user: CatalogUser;
  token: string;
}
interface Attempt {
  decision: "ALLOW" | "DENY" | "ERROR";
  reason: string;
  status: number;
  who: string;
  what: string;
  on: string;
}

const AVATAR_COLORS = ["#6c63ff", "#0e9f6e", "#d97706", "#db2777", "#0891b2", "#7c3aed", "#dc2626", "#2563eb"];
function initials(name: string): string {
  const clean = name.replace(/\(.*$/, "").trim();
  return (clean[0] ?? "?").toUpperCase();
}
function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}
function Avatar({ id, name, size = 34 }: { id: string; name: string; size?: number }) {
  return (
    <span className="avatar" style={{ background: avatarColor(id), width: size, height: size, fontSize: size * 0.42 }}>
      {initials(name)}
    </span>
  );
}

type TabKey = "test" | "expenses" | "workflow" | "admin" | "audit";
const TABS: { key: TabKey; icon: string; label: string; desc: string }[] = [
  { key: "test", icon: "🧪", label: "Scenario Tester", desc: "Act as any user and fire an action — see the live ALLOW / DENY decision and the reason behind it." },
  { key: "expenses", icon: "🧾", label: "Expenses", desc: "Create and submit expenses, and approve or reject the ones waiting on you." },
  { key: "workflow", icon: "🔀", label: "Workflow", desc: "Configure the approval steps an expense must clear — by amount threshold and required role." },
  { key: "admin", icon: "🛡️", label: "Role Admin", desc: "Assign or revoke roles. Changes take effect on the very next decision." },
  { key: "audit", icon: "📜", label: "Audit Log", desc: "Every access decision the platform made — who, what, and why." },
];

function decisionOf(r: CallResult): { decision: Attempt["decision"]; reason: string } {
  if (r.status === 200 || r.status === 201) return { decision: "ALLOW", reason: r.json?._authz?.reason ?? "access granted" };
  if (r.status === 403) return { decision: "DENY", reason: r.json?.reason ?? "denied" };
  return { decision: "ERROR", reason: r.json?.error ?? r.json?.reason ?? `HTTP ${r.status}` };
}

function Badge({ d }: { d: Attempt["decision"] }) {
  return <span className={`badge badge-${d.toLowerCase()}`}>{d}</span>;
}

export function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [acting, setActing] = useState<Acting | null>(null);
  const [tab, setTab] = useState<"test" | "expenses" | "workflow" | "admin" | "audit">("test");

  const [action, setAction] = useState<ActionKey>("expense:read");
  const [resourceId, setResourceId] = useState("");
  const [amount, setAmount] = useState(50);
  const [history, setHistory] = useState<Attempt[]>([]);

  const refreshCatalog = () => getCatalog().then(setCatalog);
  useEffect(() => {
    refreshCatalog();
  }, []);

  const kind = ACTIONS[action].kind;
  const resourceList: CatalogResource[] = useMemo(() => {
    if (!catalog) return [];
    if (kind === "expense") return catalog.expenses;
    if (kind === "payroll") return catalog.payroll;
    if (kind === "report") return catalog.reports;
    return [];
  }, [catalog, kind]);

  async function actAs(user: CatalogUser) {
    const token = await login(user.tenantSlug, user.email);
    setActing({ user, token });
  }

  async function run(over?: { token: string; action: ActionKey; resourceId: string; who: string }) {
    const tok = over?.token ?? acting?.token;
    const who = over?.who ?? acting?.user.displayName ?? "?";
    const act = over?.action ?? action;
    const rid = over?.resourceId ?? resourceId;
    if (!tok) return;
    const res = await ACTIONS[act].run(tok, rid, amount);
    const d = decisionOf(res);
    const onLabel =
      ACTIONS[act].kind === "none"
        ? "(new expense)"
        : (resourceList.find((r) => r.id === rid)?.label ?? rid);
    setHistory((h) => [{ ...d, status: res.status, who, what: act, on: onLabel }, ...h].slice(0, 30));
  }

  async function runPreset(p: Preset) {
    if (!catalog) return;
    const user = catalog.users.find((u) => u.email === p.email);
    if (!user) return;
    const rid = p.pick(catalog) ?? "";
    const token = await login(user.tenantSlug, user.email);
    setActing({ user, token });
    setAction(p.action);
    setResourceId(rid);
    await run({ token, action: p.action, resourceId: rid, who: user.displayName });
  }

  if (!catalog) return <div className="loading">Loading catalog… (are the services running on :4001–:4005?)</div>;

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="logo">AC</span>
          <div>
            <h1>Access &amp; Expense Console</h1>
            <p className="tagline">Multi-tenant access control · configurable approval workflows</p>
          </div>
        </div>
        {acting ? (
          <div className="acting-chip">
            <Avatar id={acting.user.id} name={acting.user.displayName} size={38} />
            <div className="acting-text">
              <div className="acting-name">{acting.user.displayName}</div>
              <div className="acting-meta">
                {acting.user.tenantSlug} · {acting.user.designation ?? "—"} · {acting.user.roleNames.join(", ") || "no roles"}
                {acting.user.managerName ? ` · reports to ${acting.user.managerName}` : ""}
              </div>
            </div>
          </div>
        ) : (
          <div className="acting-chip empty">Pick a user to act as →</div>
        )}
      </header>

      <div className="layout">
        <aside>
          <h3>Acting as</h3>
          {catalog.users.map((u) => (
            <button
              key={u.id}
              className={`user-card ${acting?.user.id === u.id ? "active" : ""}`}
              onClick={() => actAs(u)}
            >
              <Avatar id={u.id} name={u.displayName} size={30} />
              <span className="user-text">
                <span className="user-name">{u.displayName}</span>
                <span className="user-sub">{u.tenantSlug} · {u.designation ?? u.roleNames[0] ?? "member"}</span>
              </span>
            </button>
          ))}
        </aside>

        <main>
          <nav className="tabs">
            {TABS.map((t) => (
              <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
                <span className="tab-icon">{t.icon}</span> {t.label}
              </button>
            ))}
          </nav>
          <p className="tab-desc">{TABS.find((t) => t.key === tab)?.desc}</p>

          {tab === "test" && (
            <section>
              <div className="presets">
                <span>Quick scenarios:</span>
                {PRESETS.map((p) => (
                  <button key={p.label} onClick={() => runPreset(p)} disabled={!catalog}>
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="tester card">
                <div className="row">
                  <label>Action</label>
                  <select value={action} onChange={(e) => { setAction(e.target.value as ActionKey); setResourceId(""); }}>
                    {Object.keys(ACTIONS).map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                {kind !== "none" ? (
                  <div className="row">
                    <label>Resource</label>
                    <select value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
                      <option value="">— select —</option>
                      {resourceList.map((r) => (
                        <option key={r.id} value={r.id}>[{r.tenantSlug}] {r.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="row">
                    <label>Amount</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                  </div>
                )}
                <button className="run" disabled={!acting || (kind !== "none" && !resourceId)} onClick={() => run()}>
                  ▶ Run as {acting?.user.displayName ?? "…"}
                </button>
              </div>

              {history[0] && (
                <div className={`verdict ${history[0].decision.toLowerCase()}`}>
                  <span className="verdict-tag">{history[0].decision}</span>
                  <div className="verdict-text">
                    <div><b>{history[0].who}</b> &middot; <code>{history[0].what}</code> &middot; {history[0].on}</div>
                    <div className="verdict-reason">{history[0].reason}</div>
                  </div>
                </div>
              )}

              <h3>Attempt history</h3>
              <table className="log">
                <thead><tr><th>Decision</th><th>Who</th><th>Action</th><th>Resource</th><th>Reason (HTTP)</th></tr></thead>
                <tbody>
                  {history.length === 0 && <tr><td colSpan={5} className="empty">No attempts yet.</td></tr>}
                  {history.map((a, i) => (
                    <tr key={i}>
                      <td><Badge d={a.decision} /></td>
                      <td>{a.who}</td>
                      <td><code>{a.what}</code></td>
                      <td>{a.on}</td>
                      <td>{a.reason} <span className="status">({a.status})</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {tab === "expenses" && <ExpensesPanel acting={acting} catalog={catalog} />}
          {tab === "workflow" && <WorkflowBuilder acting={acting} catalog={catalog} />}
          {tab === "admin" && <AdminPanel acting={acting} catalog={catalog} onChange={refreshCatalog} />}
          {tab === "audit" && <AuditPanel acting={acting} catalog={catalog} />}
        </main>
      </div>
    </div>
  );
}

// ---------- Role Admin ----------
function AdminPanel({ acting, catalog, onChange }: { acting: Acting | null; catalog: Catalog; onChange: () => Promise<void> }) {
  const [msg, setMsg] = useState("");
  if (!acting) return <p className="notice">Pick a user first.</p>;

  const tenant = acting.user.tenantSlug;
  const users = catalog.users.filter((u) => u.tenantSlug === tenant);
  const roles = catalog.roles.filter((r) => r.tenantSlug === tenant);
  const roleId = (name: string) => roles.find((r) => r.name === name)?.id;

  async function mutate(fn: () => Promise<CallResult>, label: string) {
    const res = await fn();
    setMsg(res.status < 300 ? `✓ ${label}` : `✗ ${label}: ${res.json?.reason ?? res.json?.error ?? res.status}`);
    await onChange();
  }

  return (
    <section>
      <p className="notice">
        Acting as <strong>{acting.user.displayName}</strong>. Admin endpoints require an admin role —
        try as a non-admin to see the guard deny you. Changes take effect on the very next decision.
      </p>
      {msg && <p className="adminmsg">{msg}</p>}
      <table className="admin">
        <thead><tr><th>User</th><th>Org</th><th>Roles</th><th>Assign role</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.displayName}</td>
              <td>{u.orgName}</td>
              <td>
                {u.roleNames.length === 0 && <span className="muted">none</span>}
                {u.roleNames.map((rn) => (
                  <span key={rn} className="chip">
                    {rn}
                    <button title="revoke" onClick={() => { const id = roleId(rn); if (id) mutate(() => adminApi.revokeRole(acting.token, u.id, id), `revoked ${rn} from ${u.displayName}`); }}>×</button>
                  </span>
                ))}
              </td>
              <td>
                <select defaultValue="" onChange={(e) => { const id = e.target.value; e.target.value = ""; if (id) mutate(() => adminApi.assignRole(acting.token, u.id, id), `assigned role to ${u.displayName}`); }}>
                  <option value="">+ add…</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ---------- Audit ----------
function AuditPanel({ acting, catalog }: { acting: Acting | null; catalog: Catalog }) {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState("");

  const name = (id: string) => catalog.users.find((u) => u.id === id)?.displayName ?? id.slice(-6);

  async function load() {
    if (!acting) return;
    const res = await adminApi.audit(acting.token, filter || undefined);
    if (res.status >= 300) { setErr(res.json?.reason ?? res.json?.error ?? `HTTP ${res.status}`); setRows([]); return; }
    setErr("");
    setRows(Array.isArray(res.json) ? res.json : []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [acting, filter]);

  if (!acting) return <p className="notice">Pick a user first.</p>;
  return (
    <section>
      <div className="row">
        <label>Filter</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All</option>
          <option value="ALLOW">ALLOW</option>
          <option value="DENY">DENY</option>
        </select>
        <button onClick={load}>↻ Refresh</button>
      </div>
      {err && <p className="notice">Audit requires an admin role — {err}</p>}
      <table className="log">
        <thead><tr><th>When</th><th>Decision</th><th>Subject</th><th>Action</th><th>Resource</th><th>Reason</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              <td className="status">{new Date(r.createdAt).toLocaleTimeString()}</td>
              <td><Badge d={r.decision} /></td>
              <td>{name(r.subjectId)}</td>
              <td><code>{r.action}</code></td>
              <td className="status">{r.resourceType}:{String(r.resourceId).slice(-6)}</td>
              <td>{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ---------- Expenses (submit + approvals inbox) ----------
function statusBadge(s: Expense["status"]) {
  return <span className={`badge badge-${s}`}>{s}</span>;
}

function Chain({ expense, catalog }: { expense: Expense; catalog: Catalog }) {
  const name = (id: string | null) => (id ? (catalog.users.find((u) => u.id === id)?.displayName ?? id.slice(-6)) : "");
  if (expense.chain.length === 0) return <span className="muted">no steps</span>;
  return (
    <span className="stepper">
      {expense.chain.map((s, i) => {
        const cur = i === expense.currentStep && expense.status === "pending";
        const state = s.state === "approved" ? "done" : cur ? "cur" : "todo";
        return (
          <span key={i} className={`stp ${state}`}>
            <span className="stp-dot">{s.state === "approved" ? "✓" : i + 1}</span>
            <span className="stp-label">
              {s.roleName}
              {s.approverId ? <em> · {name(s.approverId)}</em> : ""}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function ExpensesPanel({ acting, catalog }: { acting: Acting | null; catalog: Catalog }) {
  const [mine, setMine] = useState<Expense[]>([]);
  const [inbox, setInbox] = useState<Expense[]>([]);
  const [amount, setAmount] = useState(100);
  const [msg, setMsg] = useState("");

  const name = (id: string) => catalog.users.find((u) => u.id === id)?.displayName ?? id.slice(-6);

  async function refresh() {
    if (!acting) return;
    const [m, i] = await Promise.all([expenseApi.mine(acting.token), expenseApi.inbox(acting.token)]);
    setMine(Array.isArray(m.json) ? m.json : []);
    setInbox(Array.isArray(i.json) ? i.json : []);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [acting]);

  if (!acting) return <p className="notice">Pick a user first.</p>;

  async function act(fn: () => Promise<CallResult>, label: string) {
    const r = await fn();
    setMsg(r.status < 300 ? `✓ ${label}` : `✗ ${label}: ${r.json?.reason ?? r.json?.error ?? r.status}`);
    await refresh();
  }

  return (
    <section>
      {msg && <p className="adminmsg">{msg}</p>}

      <div className="card">
        <div className="row">
          <label>New expense</label>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          <button className="run" onClick={() => act(() => expenseApi.create(acting!.token, amount), `created $${amount} draft`)}>+ Create draft</button>
        </div>
      </div>

      <h3>My expenses</h3>
      <table className="log">
        <thead><tr><th>Amount</th><th>Status</th><th>Approval chain</th><th></th></tr></thead>
        <tbody>
          {mine.length === 0 && <tr><td colSpan={4} className="empty">None yet.</td></tr>}
          {mine.map((e) => (
            <tr key={e.id}>
              <td>${e.amount}</td>
              <td>{statusBadge(e.status)}</td>
              <td><Chain expense={e} catalog={catalog} /></td>
              <td>{e.status === "draft" && <button onClick={() => act(() => expenseApi.submit(acting!.token, e.id), `submitted $${e.amount}`)}>Submit</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Awaiting my approval</h3>
      <table className="log">
        <thead><tr><th>Owner</th><th>Amount</th><th>Current step</th><th>Chain</th><th></th></tr></thead>
        <tbody>
          {inbox.length === 0 && <tr><td colSpan={5} className="empty">Nothing in your inbox.</td></tr>}
          {inbox.map((e) => (
            <tr key={e.id}>
              <td>{name(e.ownerId)}</td>
              <td>${e.amount}</td>
              <td><code>{e.chain[e.currentStep]?.roleName}</code></td>
              <td><Chain expense={e} catalog={catalog} /></td>
              <td className="rowbtns">
                <button onClick={() => act(() => expenseApi.approve(acting!.token, e.id), `approved $${e.amount}`)}>Approve</button>
                <button className="danger" onClick={() => act(() => expenseApi.reject(acting!.token, e.id), `rejected $${e.amount}`)}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ---------- Workflow Builder ----------
function WorkflowBuilder({ acting, catalog }: { acting: Acting | null; catalog: Catalog }) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [msg, setMsg] = useState("");
  const roles = acting ? catalog.roles.filter((r) => r.tenantSlug === acting.user.tenantSlug) : [];

  async function load() {
    if (!acting) return;
    const r = await expenseApi.getWorkflow(acting.token);
    setSteps(Array.isArray(r.json?.steps) ? r.json.steps : []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [acting]);

  if (!acting) return <p className="notice">Pick a user first.</p>;

  const update = (i: number, patch: Partial<WorkflowStep>) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => setSteps((s) => {
    const n = [...s]; const j = i + d;
    if (j < 0 || j >= n.length) return s;
    [n[i], n[j]] = [n[j]!, n[i]!];
    return n;
  });
  const addStep = () => setSteps((s) => [...s, { name: "New step", minAmount: 0, roleId: roles[0]?.id ?? "", roleName: roles[0]?.name ?? "" }]);
  const removeStep = (i: number) => setSteps((s) => s.filter((_, j) => j !== i));

  async function save() {
    const r = await expenseApi.putWorkflow(acting!.token, steps);
    setMsg(r.status < 300 ? "✓ workflow saved — affects new submissions" : `✗ ${r.json?.reason ?? r.json?.error ?? r.status} (need an admin role)`);
    if (r.status < 300) await load();
  }

  return (
    <section>
      <p className="notice">Approval steps run in order; a step applies when the amount is ≥ its threshold, and is signed by a holder of its role. Saving requires an admin role.</p>
      {msg && <p className="adminmsg">{msg}</p>}
      <table className="admin">
        <thead><tr><th>#</th><th>Step name</th><th>Applies when amount ≥</th><th>Required role</th><th></th></tr></thead>
        <tbody>
          {steps.map((s, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td><input value={s.name} onChange={(e) => update(i, { name: e.target.value })} /></td>
              <td>$<input type="number" style={{ minWidth: 90 }} value={s.minAmount} onChange={(e) => update(i, { minAmount: Number(e.target.value) })} /></td>
              <td>
                <select value={s.roleId} onChange={(e) => { const r = roles.find((x) => x.id === e.target.value); update(i, { roleId: e.target.value, roleName: r?.name ?? "" }); }}>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </td>
              <td className="rowbtns">
                <button onClick={() => move(i, -1)}>↑</button>
                <button onClick={() => move(i, 1)}>↓</button>
                <button className="danger" onClick={() => removeStep(i)}>×</button>
              </td>
            </tr>
          ))}
          {steps.length === 0 && <tr><td colSpan={5} className="empty">No steps — expenses auto-approve. Add a step.</td></tr>}
        </tbody>
      </table>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={addStep}>+ Add step</button>
        <button className="run" onClick={save}>Save workflow</button>
      </div>
    </section>
  );
}

// ---------- Preset scenarios ----------
interface Preset {
  label: string;
  email: string;
  action: ActionKey;
  pick: (c: Catalog) => string | undefined;
}
const findExp = (c: Catalog, pred: (r: CatalogResource) => boolean) => c.expenses.find(pred)?.id;
const acmeExp = (re: RegExp) => (c: Catalog) => findExp(c, (e) => e.tenantSlug === "acme" && re.test(e.label));
const PRESETS: Preset[] = [
  { label: "Manager approves report (allow)", email: "bob@acme.com", action: "expense:approve", pick: acmeExp(/\$100 /) },
  { label: "Over Manager limit (deny)", email: "bob@acme.com", action: "expense:approve", pick: acmeExp(/\$9000 /) },
  { label: "Director clears it (allow)", email: "grace@acme.com", action: "expense:approve", pick: acmeExp(/\$9000 /) },
  { label: "CFO approves any amount (allow)", email: "fiona@acme.com", action: "expense:approve", pick: acmeExp(/\$40000 /) },
  { label: "Outside reporting line (deny)", email: "bob@acme.com", action: "expense:approve", pick: acmeExp(/\$150 /) },
  { label: "Self-approval blocked (deny)", email: "bob@acme.com", action: "expense:approve", pick: acmeExp(/\$300 /) },
  { label: "Payroll need-to-know (deny)", email: "fiona@acme.com", action: "payroll:read", pick: (c) => c.payroll.find((p) => p.tenantSlug === "acme")?.id },
  { label: "Cross-tenant read (deny)", email: "carol@acme.com", action: "expense:read", pick: (c) => findExp(c, (e) => e.tenantSlug === "globex") },
];
