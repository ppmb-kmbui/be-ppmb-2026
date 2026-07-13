import assert from "node:assert/strict";
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

console.log("Validator kontrak task lulus.");
