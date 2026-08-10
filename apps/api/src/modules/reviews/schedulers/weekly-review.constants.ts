/**
 * BullMQ queue / job constants for the weekly review scheduler.
 */

/** BullMQ queue name */
export const WEEKLY_REVIEW_QUEUE = 'weekly-review';

/** Repeatable job name prefix; the full key includes the workspaceId. */
export const WEEKLY_REVIEW_JOB_PREFIX = 'weekly-review:';

/**
 * Cron pattern: every Sunday at 20:00 (8 PM).
 * Format: minute hour day-of-month month day-of-week
 */
export const WEEKLY_REVIEW_CRON = '0 20 * * 0';

/** Default timezone fallback when a workspace has no timezone set. */
export const DEFAULT_TIMEZONE = 'Asia/Shanghai';
