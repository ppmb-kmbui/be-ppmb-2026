import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isEligibleTaskOwner,
  taskOwnerForbiddenResponse,
} from "../src/lib/taskOwner";
import {
  googleDocsResourceId,
  isGoogleDriveResourceUrl,
  isImageUrl,
  isPdfUrl,
  urlResourceKey,
} from "../src/utils/taskSubmission";

assert.equal(
  googleDocsResourceId("https://docs.google.com/document/d/document-one/edit"),
  "document-one",
);
assert.equal(
  googleDocsResourceId("https://docs.google.com/document/u/0/d/document-two/edit?usp=sharing"),
  "document-two",
);
assert.equal(googleDocsResourceId("https://docs.google.com/spreadsheets/d/sheet-one/edit"), null);
assert.equal(googleDocsResourceId("https://docs.google.com/"), null);
assert.equal(googleDocsResourceId("https://docs.google.com/document/invalid/d/not-a-doc"), null);

assert.equal(isGoogleDriveResourceUrl("https://drive.google.com/drive/folders/folder-one"), true);
assert.equal(isGoogleDriveResourceUrl("https://drive.google.com/file/d/file-one/view"), true);
assert.equal(isGoogleDriveResourceUrl("https://drive.google.com/open?id=file-two"), true);
assert.equal(isGoogleDriveResourceUrl("https://drive.google.com/"), false);
assert.equal(isGoogleDriveResourceUrl("https://drive.google.com/not-drive/folders/folder-two"), false);

assert.equal(isPdfUrl("https://res.cloudinary.com/demo/raw/upload/task.pdf?version=1"), true);
assert.equal(isPdfUrl("https://docs.google.com/document/d/not-a-pdf/edit"), false);

assert.equal(isImageUrl("https://res.cloudinary.com/demo/image/upload/task"), true);
assert.equal(isImageUrl("https://example.com/task/photo.webp"), true);
assert.equal(isImageUrl("https://placehold.co/600x600/png"), true);
assert.equal(isImageUrl("https://example.com/task/file.pdf"), false);

assert.equal(
  urlResourceKey("https://example.com/task.pdf?version=1"),
  urlResourceKey("https://example.com/task.pdf?version=2#preview"),
);

assert.equal(isEligibleTaskOwner({ batch: 2026, isAdmin: false }), true);
assert.equal(isEligibleTaskOwner({ batch: 2025, isAdmin: false }), false);
assert.equal(isEligibleTaskOwner({ batch: 2026, isAdmin: true }), false);

const forbiddenResponse = taskOwnerForbiddenResponse();
assert.equal(forbiddenResponse.status, 403);
assert.deepEqual(await forbiddenResponse.json(), {
  success: false,
  status: 403,
  message: "Fitur tugas hanya tersedia untuk peserta angkatan 2026",
  error: "TASKS_FOR_2026_ONLY",
});

const taskRoutePaths = [
  "../src/app/api/v1/tasks/route.ts",
  "../src/app/api/v1/tasks/explorer/route.ts",
  "../src/app/api/v1/tasks/fossib/route.ts",
  "../src/app/api/v1/tasks/insight-hunting/route.ts",
  "../src/app/api/v1/tasks/mentoring/route.ts",
  "../src/app/api/v1/tasks/mentoring/videos/route.ts",
  "../src/app/api/v1/tasks/networking/route.ts",
  "../src/app/api/v1/tasks/networking/[friendId]/route.ts",
];

let protectedTaskHandlers = 0;
for (const routePath of taskRoutePaths) {
  const source = readFileSync(new URL(routePath, import.meta.url), "utf8");
  const handlers = source.match(
    /export async function (?:GET|POST|PUT|PATCH|DELETE)\s*\(/g,
  ) ?? [];
  const guards = source.match(/taskOwnerGuard\(userId\)/g) ?? [];

  assert.equal(
    guards.length,
    handlers.length,
    `${routePath} harus memanggil taskOwnerGuard untuk setiap handler`,
  );
  protectedTaskHandlers += handlers.length;
}

assert.equal(protectedTaskHandlers, 13);

console.log(`Validator kontrak task lulus; ${protectedTaskHandlers} handler dibatasi ke peserta 2026.`);
