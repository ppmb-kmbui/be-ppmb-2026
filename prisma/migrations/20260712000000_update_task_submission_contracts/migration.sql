-- Networking submissions now use a PDF URL. Keep img_url for legacy data.
ALTER TABLE "NetworkingTask" ADD COLUMN "file_url" TEXT;
ALTER TABLE "NetworkingKatingTask" ADD COLUMN "file_url" TEXT;

-- FOSSIB submissions may contain a document URL and a separate photo URL.
ALTER TABLE "FirstFossibSessionSubmission" ADD COLUMN "photo_url" TEXT;
ALTER TABLE "SecondFossibSessionSubmission" ADD COLUMN "photo_url" TEXT;
