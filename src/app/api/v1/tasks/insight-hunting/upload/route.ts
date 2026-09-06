import { authenticateRequest } from "@/lib/auth";
import {
  INSIGHT_HUNTING_MULTIPART_MAX_BODY_BYTES,
  ServerUploadError,
  uploadPdfToCloudinary,
  validatePdfUpload,
} from "@/lib/cloudinaryUpload";
import { prisma } from "@/lib/prisma";
import { taskOwnerGuard } from "@/lib/taskOwner";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { taskSubmissionErrorResponse } from "@/utils/taskSubmission";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function uploadErrorResponse(error: ServerUploadError) {
  return serverResponse({
    success: false,
    message: error.message,
    error: error.code,
    status: error.status,
  });
}

function requestTooLargeResponse() {
  return uploadErrorResponse(new ServerUploadError(
    "Request upload terlalu besar. Ukuran PDF maksimal 4 MiB.",
    "PDF_FILE_TOO_LARGE",
    413,
  ));
}

export async function POST(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  const ownerResponse = await taskOwnerGuard(userId);
  if (ownerResponse) return ownerResponse;

  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("multipart/form-data;")) {
    return uploadErrorResponse(new ServerUploadError(
      "Gunakan multipart/form-data dengan field file.",
      "MULTIPART_FORM_DATA_REQUIRED",
      415,
    ));
  }

  const contentLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > INSIGHT_HUNTING_MULTIPART_MAX_BODY_BYTES) {
    return requestTooLargeResponse();
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return uploadErrorResponse(new ServerUploadError(
      "Body multipart tidak valid.",
      "MULTIPART_BODY_INVALID",
      400,
    ));
  }

  try {
    const files = formData.getAll("file");
    if (files.length !== 1) {
      return uploadErrorResponse(new ServerUploadError(
        "Kirim tepat satu file PDF pada field 'file'.",
        "PDF_FILE_COUNT_INVALID",
        400,
      ));
    }

    const pdf = await validatePdfUpload(files[0]);
    const file_url = await uploadPdfToCloudinary({ bytes: pdf.bytes, userId });
    const submittedAt = new Date();
    const data = await prisma.insightHuntingSubmission.upsert({
      where: { userId },
      update: { file_url, submittedAt },
      create: { file_url, userId, submittedAt },
    });

    return serverResponse({
      success: true,
      message: "Data Insight Hunting tersimpan",
      data,
      status: 200,
    });
  } catch (error) {
    if (error instanceof ServerUploadError) return uploadErrorResponse(error);
    return taskSubmissionErrorResponse(error);
  }
}
