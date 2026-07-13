import "dotenv/config";
import { Client } from "pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL atau DATABASE_URL belum dikonfigurasi");
}

const client = new Client({ connectionString });

async function count(query: string): Promise<number> {
  const result = await client.query<{ count: number }>(query);
  return Number(result.rows[0]?.count ?? 0);
}

async function tableExists(regclass: string): Promise<boolean> {
  const result = await client.query<{ table_name: string | null }>(
    "SELECT to_regclass($1) AS table_name",
    [regclass],
  );
  return Boolean(result.rows[0]?.table_name);
}

async function countIfExists(regclass: string, query: string): Promise<number | null> {
  return await tableExists(regclass) ? count(query) : null;
}

async function countIfAllExist(regclasses: string[], query: string): Promise<number | null> {
  for (const regclass of regclasses) {
    if (!await tableExists(regclass)) return null;
  }
  return count(query);
}

await client.connect();

try {
  await client.query("BEGIN READ ONLY");

  const result = {
    duplicatePairs: {
      connections: await countIfExists('public.connections', `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT from_id, to_id
          FROM connections
          GROUP BY from_id, to_id
          HAVING COUNT(*) > 1
        ) AS duplicate_pairs
      `),
      connectionRequests: await countIfExists('public.connection_requests', `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT from_id, to_id
          FROM connection_requests
          GROUP BY from_id, to_id
          HAVING COUNT(*) > 1
        ) AS duplicate_pairs
      `),
    },
    legacyRows: {
      networkingMaba: await countIfExists(
        'public."NetworkingTask"',
        'SELECT COUNT(*)::int AS count FROM "NetworkingTask"',
      ),
      networkingKating: await countIfExists(
        'public."NetworkingKatingTask"',
        'SELECT COUNT(*)::int AS count FROM "NetworkingKatingTask"',
      ),
      networkingMabaAnswers: await countIfExists(
        'public."QuestionTask"',
        'SELECT COUNT(*)::int AS count FROM "QuestionTask"',
      ),
      networkingKatingAnswers: await countIfExists(
        'public."QuestionKatingTask"',
        'SELECT COUNT(*)::int AS count FROM "QuestionKatingTask"',
      ),
      networkingMabaQuestions: await countIfExists(
        'public."questions"',
        'SELECT COUNT(*)::int AS count FROM "questions"',
      ),
      networkingKatingQuestions: await countIfExists(
        'public."questions_kating"',
        'SELECT COUNT(*)::int AS count FROM "questions_kating"',
      ),
      networkingSeniorUsers: await countIfExists(
        'public."senior_users"',
        'SELECT COUNT(*)::int AS count FROM "senior_users"',
      ),
      firstFossib: await countIfExists(
        'public."FirstFossibSessionSubmission"',
        'SELECT COUNT(*)::int AS count FROM "FirstFossibSessionSubmission"',
      ),
      secondFossib: await countIfExists(
        'public."SecondFossibSessionSubmission"',
        'SELECT COUNT(*)::int AS count FROM "SecondFossibSessionSubmission"',
      ),
      completeFossibUsers: await countIfAllExist([
        'public."FirstFossibSessionSubmission"',
        'public."SecondFossibSessionSubmission"',
      ], `
        SELECT COUNT(DISTINCT complete_submission."userId")::int AS count
        FROM (
          SELECT "userId", "file_url", "photo_url"
          FROM "FirstFossibSessionSubmission"
          UNION ALL
          SELECT "userId", "file_url", "photo_url"
          FROM "SecondFossibSessionSubmission"
        ) AS complete_submission
        WHERE complete_submission."file_url" IS NOT NULL
          AND BTRIM(complete_submission."file_url") <> ''
          AND complete_submission."photo_url" IS NOT NULL
          AND BTRIM(complete_submission."photo_url") <> ''
      `),
      fossibUsersToBackfill: await countIfAllExist([
        'public."FirstFossibSessionSubmission"',
        'public."SecondFossibSessionSubmission"',
      ], `
        SELECT COUNT(DISTINCT canonical_submission."userId")::int AS count
        FROM (
          SELECT "userId", "file_url", "photo_url"
          FROM "FirstFossibSessionSubmission"
          UNION ALL
          SELECT "userId", "file_url", "photo_url"
          FROM "SecondFossibSessionSubmission"
        ) AS canonical_submission
        WHERE canonical_submission."file_url" IS NOT NULL
          AND LOWER(SPLIT_PART(SPLIT_PART(canonical_submission."file_url", '?', 1), '#', 1)) LIKE 'https://%.pdf'
          AND canonical_submission."photo_url" IS NOT NULL
          AND LOWER(canonical_submission."photo_url") LIKE 'https://%'
          AND (
            LOWER(canonical_submission."photo_url") ~ '^https://res\\.cloudinary\\.com/[^/]+/image/upload/'
            OR LOWER(SPLIT_PART(SPLIT_PART(canonical_submission."photo_url", '?', 1), '#', 1)) ~ '\\.(png|jpe?g|webp|gif|heic|avif)$'
            OR LOWER(SPLIT_PART(SPLIT_PART(canonical_submission."photo_url", '?', 1), '#', 1)) ~ '/(png|jpe?g|webp|gif|heic|avif)$'
          )
          AND canonical_submission."file_url" <> canonical_submission."photo_url"
      `),
      insightRows: await countIfExists(
        'public."InsightHuntingSubmission"',
        'SELECT COUNT(*)::int AS count FROM "InsightHuntingSubmission"',
      ),
      insightPdfRows: await countIfExists(
        'public."InsightHuntingSubmission"',
        `SELECT COUNT(*)::int AS count
         FROM "InsightHuntingSubmission"
         WHERE LOWER(SPLIT_PART(SPLIT_PART("file_url", '?', 1), '#', 1)) LIKE 'https://%.pdf'`,
      ),
      mentoringVlogs: await countIfExists(
        'public."MentoringVlogSubmission"',
        'SELECT COUNT(*)::int AS count FROM "MentoringVlogSubmission"',
      ),
      mentoringReflections: await countIfExists(
        'public."MentoringReflection"',
        'SELECT COUNT(*)::int AS count FROM "MentoringReflection"',
      ),
      mentoringDriveLinksToBackfill: await countIfExists(
        'public."MentoringVlogSubmission"',
        `SELECT COUNT(*)::int AS count
         FROM "MentoringVlogSubmission"
         WHERE LOWER("file_url") ~ '^https://drive\\.google\\.com/(file/d/[^/?#]+|drive/(u/[0-9]+/)?folders/[^/?#]+|open\\?[^#]*id=[^&#]+)'`,
      ),
    },
  };

  await client.query("ROLLBACK");
  console.log(JSON.stringify(result, null, 2));

  if (
    (result.duplicatePairs.connections ?? 0) > 0 ||
    (result.duplicatePairs.connectionRequests ?? 0) > 0
  ) {
    throw new Error(
      "Ditemukan pasangan koneksi duplikat. Migration dihentikan agar data tidak dihapus otomatis.",
    );
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
