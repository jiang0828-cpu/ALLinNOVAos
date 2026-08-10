// Task Status Machine Constants
// Defines valid state transitions for Task (WorkItem with itemType=TASK)

import { WorkItemStatus } from '@prisma/client';

/**
 * Task status machine definition
 * 
 * State: INBOX -> TODO -> IN_PROGRESS -> DONE
 * Transitions:
 *   - INBOX -> IN_PROGRESS (start)
 *   - INBOX -> CANCELLED (cancel)
 *   - TODO -> IN_PROGRESS (start)
 *   - TODO -> BLOCKED (block)
 *   - TODO -> CANCELLED (cancel)
 *   - IN_PROGRESS -> DONE (complete)
 *   - IN_PROGRESS -> BLOCKED (block)
 *   - IN_PROGRESS -> CANCELLED (cancel)
 *   - BLOCKED -> IN_PROGRESS (resume)
 *   - BLOCKED -> CANCELLED (cancel)
 */

export type TaskState = WorkItemStatus;

/**
 * Valid transitions map: current status -> set of allowed next statuses
 */
export const TASK_STATE_TRANSITIONS: Record<TaskState, TaskState[]> = {
  [WorkItemStatus.INBOX]: [WorkItemStatus.IN_PROGRESS, WorkItemStatus.CANCELLED],
  [WorkItemStatus.TODO]: [WorkItemStatus.IN_PROGRESS, WorkItemStatus.BLOCKED, WorkItemStatus.CANCELLED],
  [WorkItemStatus.IN_PROGRESS]: [WorkItemStatus.DONE, WorkItemStatus.BLOCKED, WorkItemStatus.CANCELLED],
  [WorkItemStatus.BLOCKED]: [WorkItemStatus.IN_PROGRESS, WorkItemStatus.CANCELLED],
  [WorkItemStatus.DONE]: [], // Terminal state
  [WorkItemStatus.COMPLETED]: [], // Terminal state
  [WorkItemStatus.CANCELLED]: [], // Terminal state
  [WorkItemStatus.ACTIVE]: [], // Not used for tasks
  [WorkItemStatus.PLANNING]: [], // Not used for tasks
  [WorkItemStatus.ARCHIVED]: [], // Not used for tasks
};

/**
 * Check if a state transition is valid
 */
export function isValidTransition(current: TaskState, next: TaskState): boolean {
  const allowed = TASK_STATE_TRANSITIONS[current];
  return allowed.includes(next);
}

/**
 * Get valid next states for a given state
 */
export function getValidTransitions(current: TaskState): TaskState[] {
  return TASK_STATE_TRANSITIONS[current];
}

/**
 * Task initial status when created
 */
export const TASK_INITIAL_STATUS: TaskState = WorkItemStatus.TODO;

/**
 * Actions that can trigger state transitions
 */
export enum TaskAction {
  START = 'start',
  BLOCK = 'block',
  COMPLETE = 'complete',
  CANCEL = 'cancel',
  RESUME = 'resume',
}

/**
 * Map actions to target states
 */
export const ACTION_TO_STATE: Record<TaskAction, TaskState> = {
  [TaskAction.START]: WorkItemStatus.IN_PROGRESS,
  [TaskAction.BLOCK]: WorkItemStatus.BLOCKED,
  [TaskAction.COMPLETE]: WorkItemStatus.DONE,
  [TaskAction.CANCEL]: WorkItemStatus.CANCELLED,
  [TaskAction.RESUME]: WorkItemStatus.IN_PROGRESS,
};
