import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { isGoogleDriveResourceUrl, taskSubmissionErrorResponse } from "@/utils/taskSubmission";
import { NextRequest } from "next/server";
import { z } from "zod";

const GdriveUrlSchema = z.string().trim().url("Link Google Drive tidak valid").refine(
  (value) => isGoogleDriveResourceUrl(value),
  "Link harus mengarah ke file atau folder Google Drive",
);
const SubmissionSchema = z.object({
  gdrive_url: GdriveUrlSchema.optional(),
  gdriveUrl: GdriveUrlSchema.optional(),
  file_url: GdriveUrlSchema.optional(),
}).refine((body) => body.gdrive_url || body.gdriveUrl || body.file_url, "Link Google Drive wajib diisi");

async function getUserId(req: NextRequest) {
  try {
    return (await authenticateRequest(req)).userId;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return unauthorizedResponse();
  const [submission, reflection, vlog] = await Promise.all([
    prisma.mentoringSubmission.findUnique({ where: { userId } }),
    prisma.mentoringReflection.findUnique({ where: { userId } }),
    prisma.mentoringVlogSubmission.findUnique({ where: { userId } }),
  ]);
  const serializedSubmission = submission ? {
    id: submission.id,
    userId: submission.userId,
    file_url: submission.gdriveUrl,
    gdrive_url: submission.gdriveUrl,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  } : null;

  return serverResponse({
    success: true,
    message: "Berhasil mengambil data mentoring",
    data: {
      submission: serializedSubmission,
      gdrive_url: submission?.gdriveUrl ?? null,
      // Historical reflection/vlog data is retained for audit only and does
      // not contribute to mentoring progress anymore.
      reflection,
      vlog,
    },
    status: 200,
  });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return unauthorizedResponse();

  try {
    const raw = SubmissionSchema.parse(await req.json());
    const gdriveUrl = raw.gdrive_url ?? raw.gdriveUrl ?? raw.file_url!;
    const data = await prisma.mentoringSubmission.upsert({
      where: { userId },
      update: { gdriveUrl },
      create: { userId, gdriveUrl },
    });

    return serverResponse({
      success: true,
      message: "Link Google Drive mentoring tersimpan",
      data: {
        submission: {
          id: data.id,
          userId: data.userId,
          file_url: data.gdriveUrl,
          gdrive_url: data.gdriveUrl,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
        gdrive_url: data.gdriveUrl,
      },
      status: 200,
    });
  } catch (error) {
    return taskSubmissionErrorResponse(error);
  }
}
