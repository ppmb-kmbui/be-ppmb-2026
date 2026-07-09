import { prisma } from "@/lib/prisma";
import serverResponse, { InvalidHeadersResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";
import { z } from "zod";

const SubmissionSchema = z.object({ file_url: z.string().trim().min(1, "URL file wajib diisi") });

export async function POST(req: NextRequest) {
  const userId = req.headers.get("X-User-Id");
  if (!userId) return InvalidHeadersResponse;
  try {
    const body = SubmissionSchema.parse(await req.json());
    const data = await prisma.insightHuntingSubmission.upsert({
      where: { userId: +userId }, update: body, create: { ...body, userId: +userId },
    });
    return serverResponse({ success: true, message: "Data Insight Hunting tersimpan", data, status: 200 });
  } catch (error) {
    return serverResponse({ success: false, message: "Operasi gagal", error: error instanceof z.ZodError ? error.errors : "Body tidak valid", status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("X-User-Id");
  if (!userId) return InvalidHeadersResponse;
  const data = await prisma.insightHuntingSubmission.findUnique({ where: { userId: +userId } });
  return serverResponse({ success: true, message: "Berhasil memperoleh data Insight Hunting", data, status: 200 });
}
