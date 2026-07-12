import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";
import { z } from "zod";

const DocsUrlSchema = z.string().trim().min(1, "URL Google Docs wajib diisi");
const SubmissionSchema = z.object({
  file_url: DocsUrlSchema.optional(),
  docs_url: DocsUrlSchema.optional(),
  docsUrl: DocsUrlSchema.optional(),
}).refine((body) => body.file_url || body.docs_url || body.docsUrl, "URL Google Docs wajib diisi");

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
    const raw = SubmissionSchema.parse(await req.json());
    const body = { file_url: raw.file_url ?? raw.docs_url ?? raw.docsUrl! };
    const data = await prisma.insightHuntingSubmission.upsert({
      where: { userId }, update: body, create: { ...body, userId },
    });
    return serverResponse({ success: true, message: "Data Insight Hunting tersimpan", data, status: 200 });
  } catch (error) {
    return serverResponse({ success: false, message: "Operasi gagal", error: error instanceof z.ZodError ? error.errors : "Body tidak valid", status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return unauthorizedResponse();
  const data = await prisma.insightHuntingSubmission.findUnique({ where: { userId } });
  return serverResponse({ success: true, message: "Berhasil memperoleh data Insight Hunting", data, status: 200 });
}
