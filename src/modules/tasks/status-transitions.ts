import { TaskStatus } from '@prisma/client';

// Spec:
//   TODO → IN_PROGRESS → IN_REVIEW → DONE
//   ↘ BLOCKED (reachable from any ACTIVE state)
// Re-opening from BLOCKED returns to the state implied by the user (we accept any active state).
// DONE is terminal — explicitly NOT reopenable to keep the state machine tight.

const ACTIVE_STATES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW'];

const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO:        ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['IN_REVIEW', 'BLOCKED'],
  IN_REVIEW:   ['DONE', 'IN_PROGRESS', 'BLOCKED'],
  DONE:        [],
  BLOCKED:     ACTIVE_STATES,
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export function allowedNextStates(from: TaskStatus): TaskStatus[] {
  return [...TRANSITIONS[from]];
}
