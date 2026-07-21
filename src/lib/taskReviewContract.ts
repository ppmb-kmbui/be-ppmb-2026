import { z } from "zod";

export const TASK_REVIEW_TYPE_BY_SLUG = {
  networking: "NETWORKING",
  explorer: "EXPLORER",
  mentoring: "MENTORING",
  fossib: "FOSSIB",
  "insight-hunting": "INSIGHT_HUNTING",
} as const;

export type TaskReviewSlug = keyof typeof TASK_REVIEW_TYPE_BY_SLUG;
export type TaskReviewDatabaseType =
  (typeof TASK_REVIEW_TYPE_BY_SLUG)[TaskReviewSlug];

export const TASK_REVIEW_SLUGS = Object.keys(
  TASK_REVIEW_TYPE_BY_SLUG,
) as TaskReviewSlug[];

const TASK_REVIEW_SLUG_BY_TYPE: Record<
  TaskReviewDatabaseType,
  TaskReviewSlug
> = {
  NETWORKING: "networking",
  EXPLORER: "explorer",
  MENTORING: "mentoring",
  FOSSIB: "fossib",
  INSIGHT_HUNTING: "insight-hunting",
};

export const TaskReviewPayloadSchema = z.object({
  score: z.number().int("Nilai harus berupa bilangan bulat").min(0, "Nilai minimal 0").max(100, "Nilai maksimal 100"),
  feedback: z.string().trim().max(4000, "Feedback maksimal 4000 karakter").nullable().optional(),
}).strict("Field penilaian tidak dikenali");

export function parseTaskReviewSlug(value: string) {
  return Object.prototype.hasOwnProperty.call(TASK_REVIEW_TYPE_BY_SLUG, value)
    ? value as TaskReviewSlug
    : null;
}

export function taskReviewTypeFromSlug(slug: TaskReviewSlug) {
  return TASK_REVIEW_TYPE_BY_SLUG[slug];
}

type TaskReviewRecord = {
  taskType: TaskReviewDatabaseType;
  score: number;
  feedback: string | null;
  reviewedAt: Date;
  reviewer: {
    id: number;
    fullname: string | null;
    email: string;
  };
};

export function serializeTaskReview(review: TaskReviewRecord) {
  return {
    taskType: TASK_REVIEW_SLUG_BY_TYPE[review.taskType],
    score: review.score,
    feedback: review.feedback,
    reviewedAt: review.reviewedAt,
    reviewer: review.reviewer,
  };
}
