import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";
import { z } from "zod";

const PhotoUrlSchema = z.string().trim().min(1, "URL foto wajib diisi");
const SubmissionSchema = z.object({
  img_url: PhotoUrlSchema.optional(),
  photo_url: PhotoUrlSchema.optional(),
  photoUrl: PhotoUrlSchema.optional(),
}).refine((body) => body.img_url || body.photo_url || body.photoUrl, "URL foto wajib diisi");

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
  const data = await prisma.explorerSubmission.findUnique({ where: { userId } });
  return serverResponse({ success: true, message: "Berhasil memperoleh submission anda", data, status: 200 });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return unauthorizedResponse();
  try {
    const raw = SubmissionSchema.parse(await req.json());
    const body = { img_url: raw.img_url ?? raw.photo_url ?? raw.photoUrl! };
    const data = await prisma.explorerSubmission.upsert({
      where: { userId },
      update: body,
      create: { ...body, userId },
    });
    return serverResponse({ success: true, message: "Submission KMBUI Explorer tersimpan", data, status: 200 });
  } catch (error) {
    return serverResponse({ success: false, message: "Operasi gagal", error: error instanceof z.ZodError ? error.errors : "Body tidak valid", status: 400 });
  }
}
