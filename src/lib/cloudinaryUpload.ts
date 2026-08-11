import { createHash } from "node:crypto";

import { INSIGHT_HUNTING_SERVER_UPLOAD_MAX_SIZE_MB } from "@/lib/const";

export const INSIGHT_HUNTING_PDF_MAX_UPLOAD_BYTES =
  INSIGHT_HUNTING_SERVER_UPLOAD_MAX_SIZE_MB * 1024 * 1024;

// A 256 KiB allowance leaves room for normal multipart metadata while keeping
// the complete request below Vercel Functions' 4.5 MB request-body limit.
export const INSIGHT_HUNTING_MULTIPART_MAX_BODY_BYTES =
  INSIGHT_HUNTING_PDF_MAX_UPLOAD_BYTES + 256 * 1024;

const PDF_MIME_TYPE = "application/pdf";
const GENERIC_BINARY_MIME_TYPES = new Set(["", "application/octet-stream"]);
const PDF_MAGIC_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
const CLOUDINARY_UPLOAD_TIMEOUT_MS = 30_000;

type UploadErrorStatus = 400 | 413 | 415 | 502 | 503;

export class ServerUploadError extends Error {
  readonly code: string;
  readonly status: UploadErrorStatus;

  constructor(message: string, code: string, status: UploadErrorStatus) {
    super(message);
    this.name = "ServerUploadError";
    this.code = code;
    this.status = status;
  }
}

export type PdfUploadFile = {
  name?: string;
  size: number;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type ValidatedPdfUpload = {
  bytes: Uint8Array;
  filename: string;
  mimeType: typeof PDF_MIME_TYPE;
  size: number;
};

type CloudinaryEnvironment = Record<string, string | undefined>;
type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

type CloudinaryUploadOptions = {
  bytes: Uint8Array;
  userId: number;
  env?: CloudinaryEnvironment;
  fetchImpl?: FetchLike;
  publicId?: string;
  timestamp?: number;
};

function isPdfUploadFile(value: unknown): value is PdfUploadFile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PdfUploadFile>;
  return typeof candidate.size === "number" &&
    typeof candidate.type === "string" &&
    typeof candidate.arrayBuffer === "function";
}

function hasPdfMagicBytes(bytes: Uint8Array): boolean {
  return PDF_MAGIC_BYTES.every((byte, index) => bytes[index] === byte);
}

export async function validatePdfUpload(value: unknown): Promise<ValidatedPdfUpload> {
  if (!isPdfUploadFile(value)) {
    throw new ServerUploadError(
      "File PDF wajib dikirim pada field 'file'.",
      "PDF_FILE_REQUIRED",
      400,
    );
  }

  const filename = typeof value.name === "string" && value.name.trim()
    ? value.name.trim()
    : "insight-hunting.pdf";
  const mimeType = value.type.split(";", 1)[0].trim().toLowerCase();
  const hasPdfExtension = filename.toLowerCase().endsWith(".pdf");
  const hasAcceptedMimeType = mimeType === PDF_MIME_TYPE ||
    (GENERIC_BINARY_MIME_TYPES.has(mimeType) && hasPdfExtension);
  if (!hasAcceptedMimeType) {
    throw new ServerUploadError(
      "File Insight Hunting harus berupa PDF dengan tipe file yang valid.",
      "PDF_MIME_TYPE_INVALID",
      415,
    );
  }

  if (!Number.isSafeInteger(value.size) || value.size <= 0) {
    throw new ServerUploadError("File PDF kosong atau tidak valid.", "PDF_FILE_INVALID", 400);
  }

  if (value.size > INSIGHT_HUNTING_PDF_MAX_UPLOAD_BYTES) {
    throw new ServerUploadError(
      `Ukuran file PDF maksimal ${INSIGHT_HUNTING_SERVER_UPLOAD_MAX_SIZE_MB} MiB untuk upload langsung.`,
      "PDF_FILE_TOO_LARGE",
      413,
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await value.arrayBuffer());
  } catch {
    throw new ServerUploadError("File PDF tidak dapat dibaca.", "PDF_FILE_UNREADABLE", 400);
  }

  if (bytes.byteLength > INSIGHT_HUNTING_PDF_MAX_UPLOAD_BYTES) {
    throw new ServerUploadError(
      `Ukuran file PDF maksimal ${INSIGHT_HUNTING_SERVER_UPLOAD_MAX_SIZE_MB} MiB untuk upload langsung.`,
      "PDF_FILE_TOO_LARGE",
      413,
    );
  }

  if (!hasPdfMagicBytes(bytes)) {
    throw new ServerUploadError(
      "Isi file tidak memiliki signature PDF yang valid.",
      "PDF_MAGIC_BYTES_INVALID",
      415,
    );
  }

  return {
    bytes,
    filename,
    mimeType: PDF_MIME_TYPE,
    size: bytes.byteLength,
  };
}

export function signCloudinaryUploadParameters(
  parameters: Record<string, string | number | boolean>,
  apiSecret: string,
): string {
  const serialized = Object.entries(parameters)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");

  return createHash("sha1").update(`${serialized}${apiSecret}`).digest("hex");
}

function getCloudinaryConfig(env: CloudinaryEnvironment) {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new ServerUploadError(
      "Layanan upload belum dikonfigurasi.",
      "CLOUDINARY_NOT_CONFIGURED",
      503,
    );
  }

  return { cloudName, apiKey, apiSecret };
}

function isExpectedCloudinaryPdfUrl(value: unknown, cloudName: string): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.startsWith(`/${cloudName}/raw/upload/`) &&
      url.pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

export async function uploadPdfToCloudinary({
  bytes,
  userId,
  env = process.env,
  fetchImpl = fetch,
  publicId,
  timestamp = Math.floor(Date.now() / 1000),
}: CloudinaryUploadOptions): Promise<string> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig(env);
  // One stable asset per participant prevents retries and resubmissions from
  // leaving abandoned raw PDFs in Cloudinary.
  const assetPublicId = publicId ?? `ppmb-2026/insight-hunting/user-${userId}.pdf`;
  const signatureParameters = { overwrite: true, public_id: assetPublicId, timestamp };
  const signature = signCloudinaryUploadParameters(signatureParameters, apiSecret);

  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: PDF_MIME_TYPE }), "insight-hunting.pdf");
  formData.append("api_key", apiKey);
  formData.append("overwrite", "true");
  formData.append("public_id", assetPublicId);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  let response: Response;
  try {
    response = await fetchImpl(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/raw/upload`,
      {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(CLOUDINARY_UPLOAD_TIMEOUT_MS),
      },
    );
  } catch {
    throw new ServerUploadError(
      "Layanan penyimpanan file tidak dapat dihubungi.",
      "CLOUDINARY_UNAVAILABLE",
      502,
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // A non-JSON response is handled as an invalid upstream response below.
  }

  if (!response.ok) {
    throw new ServerUploadError(
      "Cloudinary menolak upload file.",
      "CLOUDINARY_UPLOAD_FAILED",
      502,
    );
  }

  const secureUrl = (payload as { secure_url?: unknown } | null)?.secure_url;
  if (!isExpectedCloudinaryPdfUrl(secureUrl, cloudName)) {
    throw new ServerUploadError(
      "Cloudinary mengembalikan URL file yang tidak valid.",
      "CLOUDINARY_RESPONSE_INVALID",
      502,
    );
  }

  return secureUrl;
}
