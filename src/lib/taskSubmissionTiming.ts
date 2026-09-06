import { TASK_REVIEW_SLUGS, type TaskReviewSlug } from "@/lib/taskReviewContract";

// Every task stays open. This boundary only classifies successful submissions
// for administrators, including edits made after the end of 5 September WIB.
export const LATE_SUBMISSION_STARTS_AT = "2026-09-06T00:00:00+07:00";
const lateSubmissionStart = new Date(LATE_SUBMISSION_STARTS_AT).getTime();

export type TaskSubmissionTiming = {
  submittedAt: string | null;
  // null means the historical submission time is unknown, not on time.
  isLate: boolean | null;
};

export function getLatestSubmissionTiming(
  dates: readonly (Date | null | undefined)[],
): TaskSubmissionTiming {
  const timestamps = dates
    .map((date) => date?.getTime())
    .filter((timestamp): timestamp is number =>
      timestamp !== undefined && Number.isFinite(timestamp),
    );
  if (timestamps.length === 0) return { submittedAt: null, isLate: null };

  const latest = Math.max(...timestamps);
  return {
    submittedAt: new Date(latest).toISOString(),
    isLate: latest >= lateSubmissionStart,
  };
}

export function getTaskSubmissionTimings(
  datesByTask: Record<TaskReviewSlug, readonly (Date | null | undefined)[]>,
): Record<TaskReviewSlug, TaskSubmissionTiming> {
  return Object.fromEntries(TASK_REVIEW_SLUGS.map((taskType) => [
    taskType,
    getLatestSubmissionTiming(datesByTask[taskType]),
  ])) as Record<TaskReviewSlug, TaskSubmissionTiming>;
}
