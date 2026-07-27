import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hash } from "bcrypt";
import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";

import {
  SENIOR_PROFILE_ALLOWLIST,
  SENIOR_PROFILE_ALLOWLIST_COUNTS,
} from "../src/lib/profileVisibilityAllowlist";

type ManagedProfile = {
  id: number;
  email: string;
  fullname: string | null;
  imgUrl: string | null;
  faculty: string | null;
  batch: number;
  isAdmin: boolean;
  isProfileHidden: boolean;
};

const profiles = new Map<number, ManagedProfile>([
  [42, {
    id: 42,
    email: "alice@example.test",
    fullname: "Alice",
    imgUrl: null,
    faculty: "FIB",
    batch: 2024,
    isAdmin: false,
    isProfileHidden: false,
  }],
  [43, {
    id: 43,
    email: "budi@example.test",
    fullname: "Budi",
    imgUrl: null,
    faculty: "FT",
    batch: 2025,
    isAdmin: false,
    isProfileHidden: true,
  }],
  [77, {
    id: 77,
    email: "other-admin@example.test",
    fullname: "Admin Lain",
    imgUrl: null,
    faculty: null,
    batch: 2026,
    isAdmin: true,
    isProfileHidden: false,
  }],
]);
const authUsers = new Map([
  [9001, { id: 9001, isAdmin: true, isSuperAdmin: true }],
  [9002, { id: 9002, isAdmin: true, isSuperAdmin: false }],
]);
const loginPassword = "superadmin-password";
const loginUser = {
  id: 9001,
  email: "adminppmb@gmail.com",
  password: await hash(loginPassword, 4),
  isAdmin: true,
  isSuperAdmin: true,
};

let updateCalls = 0;
let lastFindManyArgs: Record<string, unknown> | undefined;

function serializeProfile(profile: ManagedProfile) {
  const { isAdmin: _isAdmin, ...data } = profile;
  return data;
}

const fakePrisma = {
  user: {
    findUnique: async (args: {
      where: { id?: number; email?: string };
      select?: Record<string, boolean>;
    }) => {
      if (args.where.email === loginUser.email) {
        return loginUser;
      }
      if (args.select?.isSuperAdmin) {
        return authUsers.get(args.where.id ?? -1) ?? null;
      }
      const profile = profiles.get(args.where.id ?? -1);
      if (!profile) return null;
      return args.select?.isAdmin ? { ...serializeProfile(profile), isAdmin: profile.isAdmin } : serializeProfile(profile);
    },
    count: async () => [...profiles.values()].filter(({ isAdmin }) => !isAdmin).length,
    findMany: async (args: {
      skip: number;
      take: number;
      where: Record<string, unknown>;
    }) => {
      lastFindManyArgs = args;
      return [...profiles.values()]
        .filter(({ isAdmin }) => !isAdmin)
        .slice(args.skip, args.skip + args.take)
        .map(serializeProfile);
    },
    update: async (args: {
      where: { id: number };
      data: { isProfileHidden: boolean };
    }) => {
      const profile = profiles.get(args.where.id);
      assert.ok(profile);
      updateCalls += 1;
      profile.isProfileHidden = args.data.isProfileHidden;
      return serializeProfile(profile);
    },
  },
};

Object.defineProperty(globalThis, "__prisma", {
  configurable: true,
  value: fakePrisma,
  writable: true,
});

process.env.JWT_SECRET = "superadmin-route-test-secret-at-least-32-characters";
const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);

async function signToken(
  userId: number,
  claims: { is_admin: boolean; is_super_admin: boolean },
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setExpirationTime("5m")
    .sign(jwtSecret);
}

function request(
  path: string,
  token: string,
  init: { method?: string; body?: unknown } = {},
) {
  return new NextRequest(`http://localhost:4000${path}`, {
    method: init.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
}

const [
  { GET: listProfiles },
  { PATCH: patchProfileVisibility },
  { POST: login },
] = await Promise.all([
  import("../src/app/api/v1/superadmin/profiles/route"),
  import("../src/app/api/v1/superadmin/profiles/[id]/visibility/route"),
  import("../src/app/api/v1/auth/login/route"),
]);

// Claims intentionally disagree with the database. Authorization must use the
// database-loaded role, not the claim embedded in a still-valid token.
const currentSuperAdminToken = await signToken(9001, {
  is_admin: false,
  is_super_admin: false,
});
const forgedSuperAdminToken = await signToken(9002, {
  is_admin: true,
  is_super_admin: true,
});

const loginResponse = await login(new NextRequest(
  "http://localhost:4000/api/v1/auth/login",
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "ADMINPPMB@GMAIL.COM",
      password: loginPassword,
    }),
  },
));
assert.equal(loginResponse.status, 200);
const loginBody = await loginResponse.json();
const loginToken = await jwtVerify(loginBody.data.token, jwtSecret);
assert.equal(loginToken.payload.is_admin, true);
assert.equal(loginToken.payload.is_super_admin, true);
assert.match(loginResponse.headers.get("set-cookie") ?? "", /ppmb_access_token=/);

const forbiddenList = await listProfiles(request(
  "/api/v1/superadmin/profiles",
  forgedSuperAdminToken,
));
assert.equal(forbiddenList.status, 403);

const listed = await listProfiles(request(
  "/api/v1/superadmin/profiles?page=2&limit=1&search=ali&batch=2024&visibility=hidden",
  currentSuperAdminToken,
));
assert.equal(listed.status, 200);
const listedBody = await listed.json();
assert.deepEqual(listedBody.data.pagination, {
  page: 2,
  limit: 1,
  total: 2,
  totalPages: 2,
});
assert.equal(listedBody.data.profiles.length, 1);
assert.equal(lastFindManyArgs?.skip, 1);
assert.equal(lastFindManyArgs?.take, 1);
assert.deepEqual(lastFindManyArgs?.where, {
  isAdmin: false,
  batch: 2024,
  isProfileHidden: true,
  OR: [
    { fullname: { contains: "ali", mode: "insensitive" } },
    { email: { contains: "ali", mode: "insensitive" } },
    { faculty: { contains: "ali", mode: "insensitive" } },
  ],
});

const invalidQuery = await listProfiles(request(
  "/api/v1/superadmin/profiles?visibility=secret",
  currentSuperAdminToken,
));
assert.equal(invalidQuery.status, 400);

const forbiddenPatch = await patchProfileVisibility(
  request("/api/v1/superadmin/profiles/42/visibility", forgedSuperAdminToken, {
    method: "PATCH",
    body: { hidden: true },
  }),
  { params: Promise.resolve({ id: "42" }) },
);
assert.equal(forbiddenPatch.status, 403);

const hidden = await patchProfileVisibility(
  request("/api/v1/superadmin/profiles/42/visibility", currentSuperAdminToken, {
    method: "PATCH",
    body: { hidden: true },
  }),
  { params: Promise.resolve({ id: "42" }) },
);
assert.equal(hidden.status, 200);
assert.equal((await hidden.json()).data.isProfileHidden, true);
assert.equal(updateCalls, 1);

const hiddenAgain = await patchProfileVisibility(
  request("/api/v1/superadmin/profiles/42/visibility", currentSuperAdminToken, {
    method: "PATCH",
    body: { hidden: true },
  }),
  { params: Promise.resolve({ id: "42" }) },
);
assert.equal(hiddenAgain.status, 200);
assert.equal((await hiddenAgain.json()).data.isProfileHidden, true);
assert.equal(updateCalls, 1, "PATCH identik seharusnya tidak menulis ulang profil");

const adminTarget = await patchProfileVisibility(
  request("/api/v1/superadmin/profiles/77/visibility", currentSuperAdminToken, {
    method: "PATCH",
    body: { hidden: true },
  }),
  { params: Promise.resolve({ id: "77" }) },
);
assert.equal(adminTarget.status, 403);

const invalidBody = await patchProfileVisibility(
  request("/api/v1/superadmin/profiles/42/visibility", currentSuperAdminToken, {
    method: "PATCH",
    body: { hidden: "yes" },
  }),
  { params: Promise.resolve({ id: "42" }) },
);
assert.equal(invalidBody.status, 400);

const missingTarget = await patchProfileVisibility(
  request("/api/v1/superadmin/profiles/404/visibility", currentSuperAdminToken, {
    method: "PATCH",
    body: { hidden: true },
  }),
  { params: Promise.resolve({ id: "404" }) },
);
assert.equal(missingTarget.status, 404);

assert.equal(SENIOR_PROFILE_ALLOWLIST.length, SENIOR_PROFILE_ALLOWLIST_COUNTS.total);
assert.equal(
  SENIOR_PROFILE_ALLOWLIST.filter(({ batch }) => batch === 2024).length,
  SENIOR_PROFILE_ALLOWLIST_COUNTS[2024],
);
assert.equal(
  SENIOR_PROFILE_ALLOWLIST.filter(({ batch }) => batch === 2025).length,
  SENIOR_PROFILE_ALLOWLIST_COUNTS[2025],
);
assert.equal(
  new Set(SENIOR_PROFILE_ALLOWLIST.map(({ email }) => email)).size,
  SENIOR_PROFILE_ALLOWLIST_COUNTS.total,
);

const migration = readFileSync(new URL(
  "../prisma/migrations/20260727000000_add_superadmin_profile_visibility/migration.sql",
  import.meta.url,
), "utf8");
assert.match(migration, /ADD COLUMN "is_super_admin" BOOLEAN NOT NULL DEFAULT false/);
assert.match(migration, /ADD COLUMN "is_profile_hidden" BOOLEAN NOT NULL DEFAULT false/);
assert.match(migration, /users_super_admin_requires_admin_check/);
assert.match(migration, /users_adminppmb_must_be_super_admin_check/);
assert.match(migration, /admin_matches <> 1/);
assert.match(migration, /CARDINALITY\(allowlist_2024\) <> 24/);
assert.match(migration, /CARDINALITY\(allowlist_2025\) <> 36/);
assert.match(migration, /"batch" IN \(2023, 2024, 2025\)/);
for (const { email } of SENIOR_PROFILE_ALLOWLIST) {
  assert.equal(
    migration.split(`'${email}'`).length - 1,
    1,
    `Email Lampiran I tidak tepat satu kali di migrasi: ${email}`,
  );
}

console.log(
  "Kontrak SUPERADMIN lulus: role mengikuti database, list terfilter, PATCH idempoten, admin kebal hide, dan migrasi memuat 60 akun Lampiran I.",
);
