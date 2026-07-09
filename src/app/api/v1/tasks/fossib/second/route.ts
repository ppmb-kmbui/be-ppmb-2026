import { prisma } from "@/lib/prisma";
import serverResponse, { InvalidHeadersResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";
import { z } from "zod";

const SubmissionSchema = z.object({
  file_url: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
}).refine((body) => body.file_url || body.description, "File atau deskripsi wajib diisi");

export async function GET(req: NextRequest) {
  const userId = req.headers.get("X-User-Id");
  if (!userId) return InvalidHeadersResponse;
  const data = await prisma.secondFossibSessionSubmission.findUnique({ where: { userId: +userId } });
  return serverResponse({ success: true, message: "Berhasil mendapatkan submisi Fossib kedua", data });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("X-User-Id");
  if (!userId) return InvalidHeadersResponse;
  try {
    const body = SubmissionSchema.parse(await req.json());
    const data = await prisma.secondFossibSessionSubmission.upsert({
      where: { userId: +userId }, update: body, create: { ...body, userId: +userId },
    });
    return serverResponse({ success: true, message: "Submisi Fossib kedua tersimpan", data, status: 200 });
  } catch (error) {
    return serverResponse({ success: false, message: "Operasi gagal", error: error instanceof z.ZodError ? error.errors : "Body tidak valid", status: 400 });
  }
}
