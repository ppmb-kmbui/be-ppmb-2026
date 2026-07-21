BEGIN;

CREATE TYPE "TaskReviewType" AS ENUM (
    'NETWORKING',
    'EXPLORER',
    'MENTORING',
    'FOSSIB',
    'INSIGHT_HUNTING'
);

CREATE TABLE "task_reviews" (
    "id" SERIAL NOT NULL,
    "participant_id" INTEGER NOT NULL,
    "task_type" "TaskReviewType" NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT,
    "reviewer_id" INTEGER NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "task_reviews_score_range_check" CHECK ("score" BETWEEN 0 AND 100)
);

CREATE UNIQUE INDEX "task_reviews_participant_id_task_type_key"
ON "task_reviews"("participant_id", "task_type");

CREATE INDEX "task_reviews_reviewer_id_idx"
ON "task_reviews"("reviewer_id");

ALTER TABLE "task_reviews"
ADD CONSTRAINT "task_reviews_participant_id_fkey"
FOREIGN KEY ("participant_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_reviews"
ADD CONSTRAINT "task_reviews_reviewer_id_fkey"
FOREIGN KEY ("reviewer_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
