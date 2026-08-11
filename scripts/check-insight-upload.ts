import assert from "node:assert/strict";

import {
  INSIGHT_HUNTING_MULTIPART_MAX_BODY_BYTES,
  INSIGHT_HUNTING_PDF_MAX_UPLOAD_BYTES,
  ServerUploadError,
  signCloudinaryUploadParameters,
  uploadPdfToCloudinary,
  validatePdfUpload,
} from "../src/lib/cloudinaryUpload";

const validPdfBytes = new TextEncoder().encode("%PDF-1.7\n%%EOF");

function uploadFile(
  bytes: Uint8Array,
  options: { name?: string; size?: number; type?: string; onRead?: () => void } = {},
) {
  return {
    name: options.name ?? "insight.pdf",
    size: options.size ?? bytes.byteLength,
    type: options.type ?? "application/pdf",
    async arrayBuffer() {
      options.onRead?.();
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    },
  };
}

async function expectUploadError(
  callback: () => Promise<unknown>,
  expected: { code: string; status: number },
) {
  await assert.rejects(callback, (error: unknown) => {
    assert.ok(error instanceof ServerUploadError);
    assert.equal(error.code, expected.code);
    assert.equal(error.status, expected.status);
    return true;
  });
}

const valid = await validatePdfUpload(uploadFile(validPdfBytes));
assert.equal(valid.mimeType, "application/pdf");
assert.equal(valid.size, validPdfBytes.byteLength);
assert.deepEqual(valid.bytes, validPdfBytes);

const mobilePdfWithoutMime = await validatePdfUpload(uploadFile(validPdfBytes, { type: "" }));
assert.equal(mobilePdfWithoutMime.mimeType, "application/pdf");
const mobilePdfWithGenericMime = await validatePdfUpload(uploadFile(validPdfBytes, {
  type: "application/octet-stream",
}));
assert.equal(mobilePdfWithGenericMime.mimeType, "application/pdf");

await expectUploadError(
  () => validatePdfUpload(null),
  { code: "PDF_FILE_REQUIRED", status: 400 },
);
await expectUploadError(
  () => validatePdfUpload(uploadFile(validPdfBytes, { type: "text/plain" })),
  { code: "PDF_MIME_TYPE_INVALID", status: 415 },
);
await expectUploadError(
  () => validatePdfUpload(uploadFile(validPdfBytes, { name: "insight.txt", type: "" })),
  { code: "PDF_MIME_TYPE_INVALID", status: 415 },
);
await expectUploadError(
  () => validatePdfUpload(uploadFile(new TextEncoder().encode("not a pdf"))),
  { code: "PDF_MAGIC_BYTES_INVALID", status: 415 },
);

let oversizedFileRead = false;
await expectUploadError(
  () => validatePdfUpload(uploadFile(validPdfBytes, {
    size: INSIGHT_HUNTING_PDF_MAX_UPLOAD_BYTES + 1,
    onRead: () => { oversizedFileRead = true; },
  })),
  { code: "PDF_FILE_TOO_LARGE", status: 413 },
);
assert.equal(oversizedFileRead, false, "File terlalu besar harus ditolak sebelum dibaca ke memori");
assert.ok(
  INSIGHT_HUNTING_MULTIPART_MAX_BODY_BYTES < 4_500_000,
  "Batas multipart harus tetap di bawah batas request Vercel 4.5 MB",
);

assert.equal(
  signCloudinaryUploadParameters(
    {
      eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
      public_id: "sample_image",
      timestamp: 1315060510,
    },
    "abcd",
  ),
  "bfd09f95f331f558cbd1320e67aa8d488770583e",
);

const cloudinaryUrl = await uploadPdfToCloudinary({
  bytes: validPdfBytes,
  userId: 453,
  env: {
    CLOUDINARY_CLOUD_NAME: "test-cloud",
    CLOUDINARY_API_KEY: "test-key",
    CLOUDINARY_API_SECRET: "test-secret",
  },
  timestamp: 1_786_424_400,
  fetchImpl: async (input, init) => {
    assert.equal(input.toString(), "https://api.cloudinary.com/v1_1/test-cloud/raw/upload");
    assert.equal(init?.method, "POST");
    assert.ok(init?.body instanceof FormData);
    assert.equal(init.body.get("api_key"), "test-key");
    assert.equal(init.body.get("overwrite"), "true");
    assert.equal(init.body.get("public_id"), "ppmb-2026/insight-hunting/user-453.pdf");
    assert.equal(init.body.get("timestamp"), "1786424400");
    assert.equal(
      init.body.get("signature"),
      "4aadf916f5804e7156c9f9ed7839807add4ccf39",
      "Signature harus mencakup overwrite, public_id, dan timestamp",
    );
    const file = init.body.get("file");
    assert.ok(file instanceof Blob);
    assert.equal(file.type, "application/pdf");

    return Response.json({
      secure_url:
        "https://res.cloudinary.com/test-cloud/raw/upload/v1786424400/ppmb-2026/insight-hunting/user-453.pdf",
    });
  },
});

assert.equal(
  cloudinaryUrl,
  "https://res.cloudinary.com/test-cloud/raw/upload/v1786424400/ppmb-2026/insight-hunting/user-453.pdf",
);

await expectUploadError(
  () => uploadPdfToCloudinary({ bytes: validPdfBytes, userId: 453, env: {} }),
  { code: "CLOUDINARY_NOT_CONFIGURED", status: 503 },
);

await expectUploadError(
  () => uploadPdfToCloudinary({
    bytes: validPdfBytes,
    userId: 453,
    env: {
      CLOUDINARY_CLOUD_NAME: "test-cloud",
      CLOUDINARY_API_KEY: "test-key",
      CLOUDINARY_API_SECRET: "test-secret",
    },
    timestamp: 1_786_424_400,
    fetchImpl: async () => Response.json({ error: { message: "rejected" } }, { status: 400 }),
  }),
  { code: "CLOUDINARY_UPLOAD_FAILED", status: 502 },
);

console.log("Validator upload Insight Hunting lulus.");
