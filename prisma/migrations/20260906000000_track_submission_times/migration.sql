BEGIN;

-- These two legacy models did not record submission timestamps. Leave existing
-- rows NULL instead of falsely assigning the migration time as submission time.
-- Each successful submission/resubmission now writes the server timestamp.
ALTER TABLE "ExplorerSubmission" ADD COLUMN "submitted_at" TIMESTAMP(3);
ALTER TABLE "InsightHuntingSubmission" ADD COLUMN "submitted_at" TIMESTAMP(3);

COMMIT;
