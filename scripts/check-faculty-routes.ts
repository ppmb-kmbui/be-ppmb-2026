import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

import * as register from "../src/app/api/v1/auth/register/route";
import * as profile from "../src/app/api/v1/profile/route";

const invalidFaculty = "Ilmu Komputer";

const registerResponse = await register.POST(new NextRequest(
  "http://localhost:4000/api/v1/auth/register",
  {
    method: "POST",
    body: JSON.stringify({
      fullname: "Faculty Validation Test",
      lineId: "faculty.test",
      whatsappNumber: "081234567890",
      email: "faculty-validation@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      imgUrl: "https://placehold.co/600x600/png",
      faculty: invalidFaculty,
      batch: 2026,
    }),
  },
));

assert.equal(registerResponse.status, 400);
const registerBody = await registerResponse.json();
assert.equal(registerBody.success, false);
assert.equal(
  registerBody.error.some((error: { field?: string }) => error.field === "faculty"),
  true,
);

process.env.JWT_SECRET = "faculty-route-test-secret-at-least-32-characters";
const token = await new SignJWT({ is_admin: false })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject("1")
  .setExpirationTime("5m")
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));

const profileResponse = await profile.PUT(new NextRequest(
  "http://localhost:4000/api/v1/profile",
  {
    method: "PUT",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ faculty: invalidFaculty }),
  },
));

assert.equal(profileResponse.status, 400);
const profileBody = await profileResponse.json();
assert.equal(profileBody.success, false);
assert.equal(
  profileBody.error.some((error: { path?: string[] }) => error.path?.[0] === "faculty"),
  true,
);

const invalidProfileImageResponse = await profile.PUT(new NextRequest(
  "http://localhost:4000/api/v1/profile",
  {
    method: "PUT",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ imgUrl: "javascript:alert(1)" }),
  },
));

assert.equal(invalidProfileImageResponse.status, 400);
const invalidProfileImageBody = await invalidProfileImageResponse.json();
assert.equal(invalidProfileImageBody.success, false);
assert.equal(
  invalidProfileImageBody.error.some(
    (error: { path?: string[] }) => error.path?.[0] === "imgUrl",
  ),
  true,
);

console.log(
  "Endpoint register/update profil memvalidasi fakultas dan URL foto profil.",
);
