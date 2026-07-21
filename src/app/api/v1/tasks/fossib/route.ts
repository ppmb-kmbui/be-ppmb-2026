import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { isImageUrl, isPdfUrl, taskSubmissionErrorResponse, urlResourceKey } from "@/utils/taskSubmission";
import { NextRequest } from "next/server";
import { z } from "zod";
import { taskDeadlineGuard } from "@/lib/taskDeadline";
import { taskOwnerGuard } from "@/lib/taskOwner";

const PhotoUrlSchema = z.string().trim().url("URL foto tidak valid").refine(
  (value) => isImageUrl(value),
  "Foto FOSSIB harus berupa URL gambar HTTPS",
);
const PdfUrlSchema = z.string().trim().url("URL PDF tidak valid").refine(
  (value) => isPdfUrl(value),
  "File FOSSIB harus berupa URL PDF HTTPS",
);

const SubmissionSchema = z.object({
  file_url: PdfUrlSchema,
  photo_url: PhotoUrlSchema,
}).refine(
  (body) => urlResourceKey(body.file_url) !== urlResourceKey(body.photo_url),
  { path: ["photo_url"], message: "PDF dan foto FOSSIB harus berupa dua file berbeda" },
);

async function getUserId(req: NextRequest) {
  try {
    return (await authenticateRequest(req)).userId;
  } catch {
    return null;
  }
}

function serializeSubmission(submission: {
  id: number;
  userId: number;
  fileUrl: string;
  photoUrl: string;
  createdAt: Date;
  updatedAt: Date;
} | null) {
  if (!submission) return null;

  return {
    id: submission.id,
    userId: submission.userId,
    file_url: submission.fileUrl,
    photo_url: submission.photoUrl,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return unauthorizedResponse();
  const ownerResponse = await taskOwnerGuard(userId);
  if (ownerResponse) return ownerResponse;

  const submission = await prisma.fossibSubmission.findUnique({ where: { userId } });
  return serverResponse({
    success: true,
    message: "Submission FOSSIB berhasil didapatkan",
    data: serializeSubmission(submission),
    status: 200,
  });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return unauthorizedResponse();

  const ownerResponse = await taskOwnerGuard(userId);
  if (ownerResponse) return ownerResponse;
  const deadlineResponse = taskDeadlineGuard("fossib");
  if (deadlineResponse) return deadlineResponse;

  try {
    const body = SubmissionSchema.parse(await req.json());
    const values = { fileUrl: body.file_url, photoUrl: body.photo_url };
    const submission = await prisma.fossibSubmission.upsert({
      where: { userId },
      update: values,
      create: { userId, ...values },
    });

    return serverResponse({
      success: true,
      message: "Submission FOSSIB tersimpan",
      data: serializeSubmission(submission),
      status: 200,
    });
  } catch (error) {
    return taskSubmissionErrorResponse(error);
  }
}
