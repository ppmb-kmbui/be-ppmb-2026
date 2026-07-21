import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  parseTaskReviewSlug,
  serializeTaskReview,
  TASK_REVIEW_SLUGS,
  taskReviewTypeFromSlug,
  TaskReviewPayloadSchema,
} from "../src/lib/taskReviewContract";

assert.deepEqual(TASK_REVIEW_SLUGS, [
  "networking",
  "explorer",
  "mentoring",
  "fossib",
  "insight-hunting",
]);
assert.equal(parseTaskReviewSlug("networking"), "networking");
assert.equal(parseTaskReviewSlug("insight-hunting"), "insight-hunting");
assert.equal(parseTaskReviewSlug("NETWORKING"), null);
assert.equal(parseTaskReviewSlug("unknown"), null);
assert.equal(taskReviewTypeFromSlug("networking"), "NETWORKING");
assert.equal(taskReviewTypeFromSlug("insight-hunting"), "INSIGHT_HUNTING");

assert.deepEqual(TaskReviewPayloadSchema.parse({ score: 0 }), { score: 0 });
assert.deepEqual(TaskReviewPayloadSchema.parse({ score: 100, feedback: " Bagus " }), {
  score: 100,
  feedback: "Bagus",
});
assert.throws(() => TaskReviewPayloadSchema.parse({ score: -1 }));
assert.throws(() => TaskReviewPayloadSchema.parse({ score: 101 }));
assert.throws(() => TaskReviewPayloadSchema.parse({ score: 80.5 }));
assert.throws(() => TaskReviewPayloadSchema.parse({ score: "80" }));
assert.throws(() => TaskReviewPayloadSchema.parse({ score: 80, reviewerId: 99 }));

const reviewedAt = new Date("2026-07-21T12:00:00.000Z");
assert.deepEqual(serializeTaskReview({
  taskType: "NETWORKING",
  score: 90,
  feedback: null,
  reviewedAt,
  reviewer: { id: 7, fullname: "Admin Reviewer", email: "reviewer@example.com" },
}), {
  taskType: "networking",
  score: 90,
  feedback: null,
  reviewedAt,
  reviewer: { id: 7, fullname: "Admin Reviewer", email: "reviewer@example.com" },
});

const migration = readFileSync(new URL(
  "../prisma/migrations/20260721120000_add_task_reviews/migration.sql",
  import.meta.url,
), "utf8");
assert.match(migration, /CREATE TABLE "task_reviews"/);
assert.match(migration, /CHECK \("score" BETWEEN 0 AND 100\)/);
assert.match(migration, /UNIQUE INDEX "task_reviews_participant_id_task_type_key"/);
assert.match(migration, /ON DELETE RESTRICT ON UPDATE CASCADE/);
assert.doesNotMatch(migration, /^(?:DROP|DELETE\s+FROM|TRUNCATE)\s+/im);
assert.doesNotMatch(migration, /^UPDATE\s+/im);

const adminDetailRoute = readFileSync(new URL(
  "../src/app/api/v1/admin/tasks/[id]/route.ts",
  import.meta.url,
), "utf8");
assert.match(adminDetailRoute, /findNetworkingSubmissions\(userId\)/);
assert.match(adminDetailRoute, /TASK_REVIEW_SLUGS\.map/);

const reviewRoute = readFileSync(new URL(
  "../src/app/api/v1/admin/tasks/[id]/reviews/[taskType]/route.ts",
  import.meta.url,
), "utf8");
assert.match(reviewRoute, /reviewerId = identity\.userId/);
assert.match(reviewRoute, /isTaskCompleteForReview\(participantId, taskType\)/);

console.log("Kontrak penilaian admin lulus: nilai 0-100, reviewer dari auth, migration aditif, dan semua Networking tersimpan terlihat.");
