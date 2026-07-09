import { prisma } from "@/lib/prisma";
import serverResponse, { InvalidHeadersResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";
import { z } from "zod";

const SubmissionSchema = z.object({ img_url: z.string().trim().min(1, "URL foto wajib diisi") });

export async function GET(req: NextRequest) {
  const userId = req.headers.get("X-User-Id");
  if (!userId) return InvalidHeadersResponse;
  const data = await prisma.explorerSubmission.findUnique({ where: { userId: +userId } });
  return serverResponse({ success: true, message: "Berhasil memperoleh submission anda", data, status: 200 });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("X-User-Id");
  if (!userId) return InvalidHeadersResponse;
  try {
    const body = SubmissionSchema.parse(await req.json());
    const data = await prisma.explorerSubmission.upsert({
      where: { userId: +userId },
      update: body,
      create: { ...body, userId: +userId },
    });
    return serverResponse({ success: true, message: "Submission KMBUI Explorer tersimpan", data, status: 200 });
  } catch (error) {
    return serverResponse({ success: false, message: "Operasi gagal", error: error instanceof z.ZodError ? error.errors : "Body tidak valid", status: 400 });
  }
}
