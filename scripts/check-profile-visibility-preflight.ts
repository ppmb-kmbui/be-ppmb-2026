import "dotenv/config";

import assert from "node:assert/strict";
import pg from "pg";

import {
  SENIOR_PROFILE_ALLOWLIST,
  SENIOR_PROFILE_ALLOWLIST_COUNTS,
} from "../src/lib/profileVisibilityAllowlist";

type UserMatch = {
  email: string;
  batch: number;
};

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL atau DATABASE_URL belum dikonfigurasi.");
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();

  const columnResult = await client.query<{ column_name: string }>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name IN ('is_super_admin', 'is_profile_hidden')
  `);
  const columns = new Set(columnResult.rows.map(({ column_name }) => column_name));

  const adminResult = await client.query<{ count: number }>(`
    SELECT COUNT(*)::int AS count
    FROM users
    WHERE LOWER(email) = 'adminppmb@gmail.com'
  `);
  assert.equal(adminResult.rows[0]?.count, 1, "Akun adminppmb@gmail.com harus tepat satu.");

  const cohortResult = await client.query<{ batch: number; count: number }>(`
    SELECT batch, COUNT(*)::int AS count
    FROM users
    WHERE is_admin = false
      AND batch IN (2023, 2024, 2025)
    GROUP BY batch
    ORDER BY batch
  `);

  const emails = SENIOR_PROFILE_ALLOWLIST.map(({ email }) => email);
  const matchResult = await client.query<UserMatch>(
    `
      SELECT LOWER(email) AS email, batch
      FROM users
      WHERE is_admin = false
        AND LOWER(email) = ANY($1::text[])
    `,
    [emails],
  );

  const actualPairs = new Set(
    matchResult.rows.map(({ batch, email }) => `${batch}:${email}`),
  );
  const missing = SENIOR_PROFILE_ALLOWLIST.filter(
    ({ batch, email }) => !actualPairs.has(`${batch}:${email}`),
  );
  const unexpectedBatch = matchResult.rows.filter(
    ({ batch, email }) =>
      !SENIOR_PROFILE_ALLOWLIST.some(
        (expected) => expected.batch === batch && expected.email === email,
      ),
  );

  const matchedByBatch = Object.fromEntries(
    [2024, 2025].map((batch) => [
      batch,
      matchResult.rows.filter((profile) => profile.batch === batch).length,
    ]),
  );

  console.log(
    JSON.stringify(
      {
        cohorts: cohortResult.rows,
        allowlist: {
          expected: SENIOR_PROFILE_ALLOWLIST_COUNTS,
          matched: matchResult.rowCount,
          matchedByBatch,
          missing,
          unexpectedBatch,
        },
        visibilityColumnsPresent: {
          isSuperAdmin: columns.has("is_super_admin"),
          isProfileHidden: columns.has("is_profile_hidden"),
        },
      },
      null,
      2,
    ),
  );

  assert.deepEqual(unexpectedBatch, []);

  if (columns.has("is_super_admin")) {
    const superAdminResult = await client.query<{ count: number }>(`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE LOWER(email) = 'adminppmb@gmail.com'
        AND is_admin = true
        AND is_super_admin = true
    `);
    assert.equal(
      superAdminResult.rows[0]?.count,
      1,
      "adminppmb@gmail.com belum berstatus SUPERADMIN.",
    );
  }

  if (columns.has("is_profile_hidden")) {
    const visibilityResult = await client.query<{
      allowed_hidden: number;
      hidden: number;
      visible: number;
      unlisted_visible: number;
    }>(
      `
        SELECT
          COUNT(*) FILTER (
            WHERE is_profile_hidden = true
          )::int AS hidden,
          COUNT(*) FILTER (
            WHERE is_profile_hidden = false
          )::int AS visible,
          COUNT(*) FILTER (
            WHERE LOWER(email) = ANY($1::text[])
              AND is_profile_hidden = true
          )::int AS allowed_hidden,
          COUNT(*) FILTER (
            WHERE NOT (LOWER(email) = ANY($1::text[]))
              AND is_profile_hidden = false
          )::int AS unlisted_visible
        FROM users
        WHERE is_admin = false
          AND batch IN (2023, 2024, 2025)
      `,
      [emails],
    );
    assert.equal(
      visibilityResult.rows[0]?.allowed_hidden,
      0,
      "Ada akun Lampiran I yang tersembunyi.",
    );
    assert.equal(
      visibilityResult.rows[0]?.unlisted_visible,
      0,
      "Ada akun senior di luar Lampiran I yang masih terlihat.",
    );

    console.log(
      JSON.stringify(
        {
          seniorVisibility: {
            hidden: visibilityResult.rows[0]?.hidden,
            visible: visibilityResult.rows[0]?.visible,
            allowedHidden: visibilityResult.rows[0]?.allowed_hidden,
            unlistedVisible: visibilityResult.rows[0]?.unlisted_visible,
          },
        },
        null,
        2,
      ),
    );
  }
} finally {
  await client.end();
}
