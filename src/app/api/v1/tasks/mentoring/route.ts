import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";
import { z } from "zod";

const GdriveUrlSchema = z.string().trim().min(1, "Link Google Drive wajib diisi");
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
  const reflection = await prisma.mentoringReflection.findFirst({
    where: { userId },
  });
  const vlog = await prisma.mentoringVlogSubmission.findFirst({
    where: { userId },
  });
  const submission = vlog ?? reflection;
  return serverResponse({
    success: true,
    message: "Berhasil mengambil data mentoring",
    data: {
      submission,
      gdrive_url: submission?.file_url ?? null,
      // Legacy fields are kept while the frontend migrates to submission/gdrive_url.
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
    const file_url = raw.gdrive_url ?? raw.gdriveUrl ?? raw.file_url!;
    const data = await prisma.mentoringVlogSubmission.upsert({
      where: { userId },
      update: { file_url },
      create: { userId, file_url },
    });

    return serverResponse({
      success: true,
      message: "Link Google Drive mentoring tersimpan",
      data: { submission: data, gdrive_url: data.file_url },
      status: 200,
    });
  } catch (error) {
    return serverResponse({
      success: false,
      message: "Operasi gagal",
      error: error instanceof z.ZodError ? error.errors : "Body tidak valid",
      status: 400,
    });
  }
}
