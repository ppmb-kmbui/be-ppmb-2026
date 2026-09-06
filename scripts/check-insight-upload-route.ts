import assert from "node:assert/strict";

import { SignJWT } from "jose";
import { NextRequest } from "next/server";

const USER_ID = 453;
const JWT_SECRET = "insight-upload-route-test-secret-at-least-32-characters";
const CLOUDINARY_URL =
  "https://res.cloudinary.com/test-cloud/raw/upload/v1786424400/ppmb-2026/insight-hunting/user-453.pdf";

process.env.JWT_SECRET = JWT_SECRET;
// Expired legacy configuration must no longer close submissions.
process.env.TASK_DEADLINE_INSIGHT_HUNTING = "2020-01-01T00:00:00+07:00";
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-key";
process.env.CLOUDINARY_API_SECRET = "test-secret";

let cloudinaryCalls = 0;
const upsertCalls: Array<Record<string, unknown>> = [];

const fakePrisma = {
  user: {
    findUnique: async ({ where }: { where: { id?: number } }) =>
      where.id === USER_ID
        ? { id: USER_ID, isAdmin: false, isSuperAdmin: false }
        : null,
    findFirst: async ({ where }: {
      where: { id?: number; batch?: number; isAdmin?: boolean };
    }) =>
      where.id === USER_ID && where.batch === 2026 && where.isAdmin === false
        ? { id: USER_ID, batch: 2026 }
        : null,
  },
  insightHuntingSubmission: {
    upsert: async (args: Record<string, unknown>) => {
      upsertCalls.push(args);
      return { id: 17, userId: USER_ID, file_url: CLOUDINARY_URL };
    },
  },
};

Object.defineProperty(globalThis, "__prisma", {
  configurable: true,
  value: fakePrisma,
  writable: true,
});

const originalFetch = globalThis.fetch;
Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: async (input: string | URL, init?: RequestInit) => {
    cloudinaryCalls += 1;
    assert.equal(
      input.toString(),
      "https://api.cloudinary.com/v1_1/test-cloud/raw/upload",
    );
    assert.equal(init?.method, "POST");
    assert.ok(init?.body instanceof FormData);
    assert.equal(init.body.get("public_id"), "ppmb-2026/insight-hunting/user-453.pdf");
    return Response.json({ secure_url: CLOUDINARY_URL });
  },
  writable: true,
});

const { POST } = await import(
  "../src/app/api/v1/tasks/insight-hunting/upload/route"
);

const token = await new SignJWT({ is_admin: false, is_super_admin: false })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(String(USER_ID))
  .setExpirationTime("5m")
  .sign(new TextEncoder().encode(JWT_SECRET));

function request(init: { body?: BodyInit; headers?: HeadersInit } = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return new NextRequest(
    "http://localhost:4000/api/v1/tasks/insight-hunting/upload",
    { ...init, method: "POST", headers },
  );
}

async function assertError(
  response: Response,
  expected: { status: number; error: string },
) {
  assert.equal(response.status, expected.status);
  const payload = await response.json() as { success: boolean; error?: string };
  assert.equal(payload.success, false);
  assert.equal(payload.error, expected.error);
}

try {
  const unauthenticatedResponse = await POST(new NextRequest(
    "http://localhost:4000/api/v1/tasks/insight-hunting/upload",
    { method: "POST" },
  ));
  await assertError(unauthenticatedResponse, {
    status: 401,
    error: "JWT token tidak valid atau tidak ditemukan",
  });
  assert.equal(cloudinaryCalls, 0);
  assert.equal(upsertCalls.length, 0);

  const nonMultipartResponse = await POST(request({
    headers: { "content-type": "application/json" },
    body: "{}",
  }));
  await assertError(nonMultipartResponse, {
    status: 415,
    error: "MULTIPART_FORM_DATA_REQUIRED",
  });
  assert.equal(cloudinaryCalls, 0);
  assert.equal(upsertCalls.length, 0);

  const malformedMultipartResponse = await POST(request({
    headers: { "content-type": "multipart/form-data; boundary=missing-boundary" },
    body: "not-a-multipart-body",
  }));
  await assertError(malformedMultipartResponse, {
    status: 400,
    error: "MULTIPART_BODY_INVALID",
  });
  assert.equal(cloudinaryCalls, 0);
  assert.equal(upsertCalls.length, 0);

  const emptyForm = new FormData();
  const noFileResponse = await POST(request({ body: emptyForm }));
  await assertError(noFileResponse, {
    status: 400,
    error: "PDF_FILE_COUNT_INVALID",
  });

  const duplicateFileForm = new FormData();
  duplicateFileForm.append(
    "file",
    new Blob(["%PDF-1.7\n%%EOF"], { type: "application/pdf" }),
    "first.pdf",
  );
  duplicateFileForm.append(
    "file",
    new Blob(["%PDF-1.7\n%%EOF"], { type: "application/pdf" }),
    "second.pdf",
  );
  const duplicateFileResponse = await POST(request({ body: duplicateFileForm }));
  await assertError(duplicateFileResponse, {
    status: 400,
    error: "PDF_FILE_COUNT_INVALID",
  });
  assert.equal(cloudinaryCalls, 0);
  assert.equal(upsertCalls.length, 0);

  const validForm = new FormData();
  validForm.append(
    "file",
    new Blob(["%PDF-1.7\n%%EOF"], { type: "application/pdf" }),
    "insight.pdf",
  );
  const successResponse = await POST(request({ body: validForm }));
  assert.equal(successResponse.status, 200);
  assert.deepEqual(await successResponse.json(), {
    success: true,
    status: 200,
    message: "Data Insight Hunting tersimpan",
    data: { id: 17, userId: USER_ID, file_url: CLOUDINARY_URL },
  });
  assert.equal(cloudinaryCalls, 1);
  assert.equal(upsertCalls.length, 1);
  const submittedAt = (upsertCalls[0].update as { submittedAt: Date }).submittedAt;
  assert.ok(submittedAt instanceof Date);
  assert.ok(Number.isFinite(submittedAt.getTime()));
  assert.deepEqual(upsertCalls, [{
    where: { userId: USER_ID },
    update: { file_url: CLOUDINARY_URL, submittedAt },
    create: { file_url: CLOUDINARY_URL, userId: USER_ID, submittedAt },
  }]);
} finally {
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: originalFetch,
    writable: true,
  });
}

console.log("Validator handler upload Insight Hunting lulus.");
