import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import * as register from "../src/app/api/v1/auth/register/route";
import { UpdateProfileSchema } from "../src/lib/profileContract";

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

const invalidBatchResponse = await register.POST(new NextRequest(
  "http://localhost:4000/api/v1/auth/register",
  {
    method: "POST",
    body: JSON.stringify({
      fullname: "Batch Validation Test",
      lineId: "batch.test",
      whatsappNumber: "081234567890",
      email: "batch-validation@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      imgUrl: "https://placehold.co/600x600/png",
      faculty: "Fasilkom",
      batch: 2025,
    }),
  },
));

assert.equal(invalidBatchResponse.status, 400);
const invalidBatchBody = await invalidBatchResponse.json();
assert.equal(invalidBatchBody.success, false);
assert.equal(
  invalidBatchBody.error.some((error: { field?: string; message?: string }) =>
    error.field === "batch" && error.message?.includes("2026"),
  ),
  true,
);

const profileBody = UpdateProfileSchema.safeParse({ faculty: invalidFaculty });
assert.equal(profileBody.success, false);
if (profileBody.success) throw new Error("Fakultas profil invalid lolos validasi");
assert.equal(
  profileBody.error.issues.some((error) => error.path[0] === "faculty"),
  true,
);

const invalidProfileImageBody = UpdateProfileSchema.safeParse({
  imgUrl: "javascript:alert(1)",
});
assert.equal(invalidProfileImageBody.success, false);
if (invalidProfileImageBody.success) throw new Error("URL foto profil invalid lolos validasi");
assert.equal(
  invalidProfileImageBody.error.issues.some((error) => error.path[0] === "imgUrl"),
  true,
);

console.log(
  "Endpoint register/update profil memvalidasi angkatan, fakultas, dan URL foto profil.",
);
