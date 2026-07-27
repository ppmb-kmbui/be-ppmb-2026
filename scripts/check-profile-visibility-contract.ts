import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  SENIOR_PROFILE_ALLOWLIST,
  SENIOR_PROFILE_ALLOWLIST_COUNTS,
} from "../src/lib/profileVisibilityAllowlist";

assert.equal(
  SENIOR_PROFILE_ALLOWLIST.length,
  SENIOR_PROFILE_ALLOWLIST_COUNTS.total,
);

const emails = SENIOR_PROFILE_ALLOWLIST.map(({ email }) => email);
const sourceKeys = SENIOR_PROFILE_ALLOWLIST.map(
  ({ batch, sourceName }) => `${batch}:${sourceName.toLocaleLowerCase("id-ID")}`,
);

assert.equal(new Set(emails).size, emails.length, "Email allowlist harus unik.");
assert.equal(
  new Set(sourceKeys).size,
  sourceKeys.length,
  "Nama dan angkatan allowlist harus unik.",
);
assert.equal(
  SENIOR_PROFILE_ALLOWLIST.filter(({ batch }) => batch === 2024).length,
  SENIOR_PROFILE_ALLOWLIST_COUNTS[2024],
);
assert.equal(
  SENIOR_PROFILE_ALLOWLIST.filter(({ batch }) => batch === 2025).length,
  SENIOR_PROFILE_ALLOWLIST_COUNTS[2025],
);
assert.equal(
  SENIOR_PROFILE_ALLOWLIST.every(
    ({ batch, email, sourceName }) =>
      (batch === 2024 || batch === 2025) &&
      email === email.toLowerCase() &&
      /^[a-z0-9]+@gmail\.com$/.test(email) &&
      sourceName.trim() === sourceName,
  ),
  true,
);

const migrationSql = readFileSync(
  new URL(
    "../prisma/migrations/20260727000000_add_superadmin_profile_visibility/migration.sql",
    import.meta.url,
  ),
  "utf8",
);
const migrationAllowlistEmails = new Set(
  [...migrationSql.matchAll(/'([a-z0-9]+@gmail\.com)'/g)]
    .map((match) => match[1])
    .filter((email) => email !== "adminppmb@gmail.com"),
);
assert.deepEqual(
  [...migrationAllowlistEmails].sort(),
  [...emails].sort(),
  "Allowlist migration dan kontrak TypeScript harus identik.",
);

console.log(
  `Profile visibility allowlist valid: ${SENIOR_PROFILE_ALLOWLIST.length} entries.`,
);
