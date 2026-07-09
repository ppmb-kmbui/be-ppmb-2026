-- User registration fields required by the 2026 web form.
ALTER TABLE "users"
  ADD COLUMN "line_id" TEXT,
  ADD COLUMN "whatsapp_number" TEXT,
  ALTER COLUMN "batch" SET DEFAULT 2026;

-- Simple descriptions are supported alongside the legacy question-based flow.
ALTER TABLE "NetworkingTask" ADD COLUMN "description" TEXT;
ALTER TABLE "NetworkingKatingTask" ADD COLUMN "description" TEXT;

-- Submission variants in Figma may contain a file, a description, or both.
ALTER TABLE "FirstFossibSessionSubmission" ALTER COLUMN "file_url" DROP NOT NULL;
ALTER TABLE "FirstFossibSessionSubmission" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "SecondFossibSessionSubmission" ALTER COLUMN "file_url" DROP NOT NULL;
ALTER TABLE "SecondFossibSessionSubmission" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "MentoringReflection" ALTER COLUMN "file_url" DROP NOT NULL;
ALTER TABLE "MentoringReflection" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "MentoringVlogSubmission" ADD COLUMN "description" TEXT;

-- One submission per user is enforced at database level. Migration intentionally
-- fails without deleting data if a live database contains duplicates.
CREATE UNIQUE INDEX "FirstFossibSessionSubmission_userId_key" ON "FirstFossibSessionSubmission"("userId");
CREATE UNIQUE INDEX "SecondFossibSessionSubmission_userId_key" ON "SecondFossibSessionSubmission"("userId");
CREATE UNIQUE INDEX "InsightHuntingSubmission_userId_key" ON "InsightHuntingSubmission"("userId");
CREATE UNIQUE INDEX "ExplorerSubmission_userId_key" ON "ExplorerSubmission"("userId");
CREATE UNIQUE INDEX "MentoringReflection_userId_key" ON "MentoringReflection"("userId");
CREATE UNIQUE INDEX "MentoringVlogSubmission_userId_key" ON "MentoringVlogSubmission"("userId");

CREATE TABLE "timeline_events" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "meeting_url" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "is_published" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "faqs" (
  "id" SERIAL NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "is_published" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sponsors" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "img_url" TEXT NOT NULL,
  "website_url" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "is_published" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "material_categories" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "material_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "materials" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "video_url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "is_published" BOOLEAN NOT NULL DEFAULT true,
  "category_id" INTEGER NOT NULL,
  CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "materials"
  ADD CONSTRAINT "materials_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "material_categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
