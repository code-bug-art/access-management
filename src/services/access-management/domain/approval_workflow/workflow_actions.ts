/**
 * Actions decided as a HYBRID — the expense workflow step AND a base RBAC grant must both pass.
 * Everything else is evaluated purely by the role/permission policy.
 */
const WORKFLOW_ACTIONS = new Set<string>(['expense:approve']);

export const isWorkflowAction = (action: string): boolean => WORKFLOW_ACTIONS.has(action);
