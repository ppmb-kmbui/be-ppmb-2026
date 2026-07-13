import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { isPdfUrl, taskSubmissionErrorResponse } from "@/utils/taskSubmission";
import { NextRequest } from "next/server";
import { z } from "zod";

const PdfUrlSchema = z.string().trim().url("URL PDF tidak valid").refine(
  (value) => isPdfUrl(value),
  "File Insight Hunting harus berupa URL PDF HTTPS",
);
const SubmissionSchema = z.object({
  file_url: PdfUrlSchema,
});

async function getUserId(req: NextRequest) {
  try {
    return (await authenticateRequest(req)).userId;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return unauthorizedResponse();
  try {
    const body = SubmissionSchema.parse(await req.json());
    const data = await prisma.insightHuntingSubmission.upsert({
      where: { userId }, update: body, create: { ...body, userId },
    });
    return serverResponse({ success: true, message: "Data Insight Hunting tersimpan", data, status: 200 });
  } catch (error) {
    return taskSubmissionErrorResponse(error);
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return unauthorizedResponse();
  const data = await prisma.insightHuntingSubmission.findUnique({ where: { userId } });
  return serverResponse({ success: true, message: "Berhasil memperoleh data Insight Hunting", data, status: 200 });
}
