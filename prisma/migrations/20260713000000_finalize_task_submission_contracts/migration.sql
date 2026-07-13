BEGIN;

-- One row per participant. Links may be filled one at a time; the task is
-- complete only after both Google Docs URLs have been stored.
CREATE TABLE "networking_submissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "first_docs_url" TEXT,
    "second_docs_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "networking_submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "networking_submissions_first_docs_check" CHECK (
        "first_docs_url" IS NULL
        OR LOWER("first_docs_url") ~ '^https://docs\.google\.com/document/(u/[0-9]+/)?d/(e/)?[^/?#]+'
    ),
    CONSTRAINT "networking_submissions_second_docs_check" CHECK (
        "second_docs_url" IS NULL
        OR LOWER("second_docs_url") ~ '^https://docs\.google\.com/document/(u/[0-9]+/)?d/(e/)?[^/?#]+'
    ),
    CONSTRAINT "networking_submissions_distinct_docs_check"
        CHECK ("first_docs_url" IS NULL OR "second_docs_url" IS NULL OR "first_docs_url" <> "second_docs_url")
);

CREATE UNIQUE INDEX "networking_submissions_user_id_key"
ON "networking_submissions"("user_id");

ALTER TABLE "networking_submissions"
ADD CONSTRAINT "networking_submissions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- FOSSIB is now a single submission containing one PDF and one photo.
-- Legacy session tables remain untouched because they contain important data.
CREATE TABLE "fossib_submissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fossib_submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fossib_submissions_pdf_check" CHECK (
        LOWER(SPLIT_PART(SPLIT_PART("file_url", '?', 1), '#', 1)) LIKE 'https://%.pdf'
    ),
    CONSTRAINT "fossib_submissions_photo_https_check" CHECK (LOWER("photo_url") LIKE 'https://%'),
    CONSTRAINT "fossib_submissions_photo_image_check" CHECK (
        LOWER("photo_url") ~ '^https://res\.cloudinary\.com/[^/]+/image/upload/'
        OR LOWER(SPLIT_PART(SPLIT_PART("photo_url", '?', 1), '#', 1)) ~ '\.(png|jpe?g|webp|gif|heic|avif)$'
        OR LOWER(SPLIT_PART(SPLIT_PART("photo_url", '?', 1), '#', 1)) ~ '/(png|jpe?g|webp|gif|heic|avif)$'
    ),
    CONSTRAINT "fossib_submissions_distinct_files_check" CHECK ("file_url" <> "photo_url")
);

CREATE UNIQUE INDEX "fossib_submissions_user_id_key"
ON "fossib_submissions"("user_id");

ALTER TABLE "fossib_submissions"
ADD CONSTRAINT "fossib_submissions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve any complete legacy FOSSIB submission as the canonical submission.
-- Prefer the first-session row when both legacy sessions are complete.
INSERT INTO "fossib_submissions" (
    "user_id",
    "file_url",
    "photo_url",
    "created_at",
    "updated_at"
)
SELECT DISTINCT ON (legacy."userId")
    legacy."userId",
    legacy."file_url",
    legacy."photo_url",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT "userId", "file_url", "photo_url", 1 AS priority
    FROM "FirstFossibSessionSubmission"
    UNION ALL
    SELECT "userId", "file_url", "photo_url", 2 AS priority
    FROM "SecondFossibSessionSubmission"
) AS legacy
WHERE legacy."file_url" IS NOT NULL
  AND BTRIM(legacy."file_url") <> ''
  AND legacy."photo_url" IS NOT NULL
  AND BTRIM(legacy."photo_url") <> ''
  AND LOWER(SPLIT_PART(SPLIT_PART(legacy."file_url", '?', 1), '#', 1)) LIKE 'https://%.pdf'
  AND LOWER(legacy."photo_url") LIKE 'https://%'
  AND (
      LOWER(legacy."photo_url") ~ '^https://res\.cloudinary\.com/[^/]+/image/upload/'
      OR LOWER(SPLIT_PART(SPLIT_PART(legacy."photo_url", '?', 1), '#', 1)) ~ '\.(png|jpe?g|webp|gif|heic|avif)$'
      OR LOWER(SPLIT_PART(SPLIT_PART(legacy."photo_url", '?', 1), '#', 1)) ~ '/(png|jpe?g|webp|gif|heic|avif)$'
  )
  AND legacy."file_url" <> legacy."photo_url"
ORDER BY legacy."userId", legacy.priority;

-- Mentoring previously stored vlog URLs in MentoringVlogSubmission. Keep that
-- table untouched and use a separate canonical row for the new Drive contract.
CREATE TABLE "mentoring_submissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "gdrive_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentoring_submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mentoring_submissions_drive_url_check" CHECK (
        LOWER("gdrive_url") ~ '^https://drive\.google\.com/(file/d/[^/?#]+|drive/(u/[0-9]+/)?folders/[^/?#]+|open\?[^#]*id=[^&#]+)'
    )
);

CREATE UNIQUE INDEX "mentoring_submissions_user_id_key"
ON "mentoring_submissions"("user_id");

ALTER TABLE "mentoring_submissions"
ADD CONSTRAINT "mentoring_submissions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Only rows that are already Google Drive links can be safely interpreted as
-- the new contract. All other vlog URLs remain exclusively in the legacy table.
INSERT INTO "mentoring_submissions" (
    "user_id",
    "gdrive_url",
    "created_at",
    "updated_at"
)
SELECT
    "userId",
    "file_url",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "MentoringVlogSubmission"
WHERE LOWER("file_url") ~ '^https://drive\.google\.com/(file/d/[^/?#]+|drive/(u/[0-9]+/)?folders/[^/?#]+|open\?[^#]*id=[^&#]+)'
ON CONFLICT ("user_id") DO NOTHING;

-- Existing Explorer rows are retained. The new field starts nullable because
-- historical rows do not contain an activity name.
ALTER TABLE "ExplorerSubmission"
ADD COLUMN "activity_name" TEXT;

-- These indexes are safe only when no duplicate directed pair exists. Run
-- `npm run db:check-integrity` before deploying; the migration fails instead
-- of deleting or merging important data if another environment has duplicates.
CREATE UNIQUE INDEX "connections_from_id_to_id_key"
ON "connections"("from_id", "to_id");

CREATE UNIQUE INDEX "connection_requests_from_id_to_id_key"
ON "connection_requests"("from_id", "to_id");

-- The old quota/person-based networking feature and its data were explicitly
-- retired. Drop children first so no CASCADE can affect unrelated tables.
DROP TABLE "QuestionTask";
DROP TABLE "QuestionKatingTask";
DROP TABLE "NetworkingTask";
DROP TABLE "NetworkingKatingTask";
DROP TABLE "questions";
DROP TABLE "questions_kating";
DROP TABLE "senior_users";

COMMIT;
