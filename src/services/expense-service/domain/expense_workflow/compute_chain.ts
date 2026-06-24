// -------- Interfaces -------- //
import type { WorkflowStep } from './interface';

/** The approval chain an expense of `amount` must clear: applicable steps in order (pure). */
const computeChain = (steps: WorkflowStep[], amount: number): WorkflowStep[] =>
  steps.filter((s) => amount >= s.minAmount).sort((a, b) => a.order - b.order);

export { computeChain };
