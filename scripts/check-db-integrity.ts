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

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = $2
     ) AS exists`,
    [tableName, columnName],
  );
  return result.rows[0]?.exists === true;
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

  const networkingTableExists = await tableExists("public.networking_submissions");
  const hasRetiredDocsColumns = networkingTableExists &&
    await columnExists("networking_submissions", "first_docs_url");
  const hasFriendSubmissionColumns = networkingTableExists &&
    await columnExists("networking_submissions", "friend_id");
  const hasNetworkingAnswers = await tableExists("public.networking_answers");
  const hasNetworkingQuestions = await tableExists("public.networking_questions");
  const hasNetworkingQuestionType = hasNetworkingQuestions &&
    await columnExists("networking_questions", "question_type");

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
    networking: {
      retiredTwoDocsRows: hasRetiredDocsColumns
        ? await count('SELECT COUNT(*)::int AS count FROM "networking_submissions"')
        : null,
      invalidFriendPairs: hasFriendSubmissionColumns
        ? await count(`
            SELECT COUNT(*)::int AS count
            FROM "networking_submissions" submission
            WHERE submission."user_id" = submission."friend_id"
               OR NOT EXISTS (
                    SELECT 1 FROM users owner
                    WHERE owner.id = submission."user_id"
                      AND owner.is_admin = false
                      AND owner.batch = 2026
               )
               OR NOT EXISTS (
                    SELECT 1 FROM users friend
                    WHERE friend.id = submission."friend_id"
                      AND friend.is_admin = false
                      AND friend.batch IN (2023, 2024, 2025, 2026)
               )
               OR (
                    EXISTS (
                      SELECT 1 FROM users peer
                      WHERE peer.id = submission."friend_id" AND peer.batch = 2026
                    )
                    AND (
                      NOT EXISTS (
                        SELECT 1 FROM connections outgoing
                        WHERE outgoing.from_id = submission."user_id"
                          AND outgoing.to_id = submission."friend_id"
                          AND outgoing.status IN ('accepted', 'done')
                      )
                      OR NOT EXISTS (
                        SELECT 1 FROM connections reciprocal
                        WHERE reciprocal.from_id = submission."friend_id"
                          AND reciprocal.to_id = submission."user_id"
                          AND reciprocal.status IN ('accepted', 'done')
                      )
                    )
               )
          `)
        : null,
      incompleteSubmissions: hasFriendSubmissionColumns && hasNetworkingAnswers && hasNetworkingQuestions
        ? await count(hasNetworkingQuestionType ? `
            SELECT COUNT(*)::int AS count
            FROM "networking_submissions" submission
            JOIN users friend ON friend.id = submission.friend_id
            WHERE (
              SELECT COUNT(*)
              FROM "networking_answers" answer
              JOIN "networking_questions" question ON question.id = answer.question_id
              WHERE answer.submission_id = submission.id
                AND question.is_active = true
                AND question.question_type = CASE
                  WHEN friend.batch = 2026 THEN 'PEER'::"NetworkingQuestionType"
                  ELSE 'SENIOR'::"NetworkingQuestionType"
                END
                AND BTRIM(answer.answer) <> ''
                AND (question.is_custom = false OR BTRIM(answer.custom_question) <> '')
            ) <> (
              SELECT COUNT(*)
              FROM "networking_questions" question
              WHERE question.is_active = true
                AND question.question_type = CASE
                  WHEN friend.batch = 2026 THEN 'PEER'::"NetworkingQuestionType"
                  ELSE 'SENIOR'::"NetworkingQuestionType"
                END
            )
          ` : `
            SELECT COUNT(*)::int AS count
            FROM "networking_submissions" submission
            WHERE (
              SELECT COUNT(*)
              FROM "networking_answers" answer
              JOIN "networking_questions" question ON question.id = answer.question_id
              WHERE answer.submission_id = submission.id
                AND question.is_active = true
                AND BTRIM(answer.answer) <> ''
                AND (question.is_custom = false OR BTRIM(answer.custom_question) <> '')
            ) <> (
              SELECT COUNT(*) FROM "networking_questions" WHERE is_active = true
            )
          `)
        : null,
      hasQuestionTypeCatalog: hasNetworkingQuestionType,
      activeQuestionCount: hasNetworkingQuestions
        ? await count('SELECT COUNT(*)::int AS count FROM "networking_questions" WHERE "is_active" = true')
        : null,
      activeFixedQuestionCount: hasNetworkingQuestions
        ? await count(`
            SELECT COUNT(*)::int AS count
            FROM "networking_questions"
            WHERE "is_active" = true AND "is_custom" = false
          `)
        : null,
      activeCustomQuestionCount: hasNetworkingQuestions
        ? await count(`
            SELECT COUNT(*)::int AS count
            FROM "networking_questions"
            WHERE "is_active" = true AND "is_custom" = true
          `)
        : null,
      peerQuestionCount: hasNetworkingQuestionType
        ? await count(`
            SELECT COUNT(*)::int AS count FROM "networking_questions"
            WHERE "is_active" = true AND "question_type" = 'PEER'
          `)
        : null,
      seniorQuestionCount: hasNetworkingQuestionType
        ? await count(`
            SELECT COUNT(*)::int AS count FROM "networking_questions"
            WHERE "is_active" = true AND "question_type" = 'SENIOR'
          `)
        : null,
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

  if (
    (result.networking.invalidFriendPairs ?? 0) > 0 ||
    (result.networking.incompleteSubmissions ?? 0) > 0 ||
    (result.networking.activeQuestionCount !== null &&
      result.networking.activeQuestionCount !== (hasNetworkingQuestionType ? 10 : 4)) ||
    (result.networking.activeFixedQuestionCount !== null &&
      result.networking.activeFixedQuestionCount !== (hasNetworkingQuestionType ? 8 : 3)) ||
    (result.networking.activeCustomQuestionCount !== null &&
      result.networking.activeCustomQuestionCount !== (hasNetworkingQuestionType ? 2 : 1)) ||
    (result.networking.peerQuestionCount !== null &&
      result.networking.peerQuestionCount !== 4) ||
    (result.networking.seniorQuestionCount !== null &&
      result.networking.seniorQuestionCount !== 6)
  ) {
    throw new Error(
      "Kontrak Networking baru tidak valid: katalog, jawaban, atau koneksi mutual bermasalah.",
    );
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
