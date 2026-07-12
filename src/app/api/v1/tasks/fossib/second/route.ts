import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";
import { z } from "zod";

const SubmissionSchema = z.object({
  file_url: z.string().trim().min(1).optional(),
  docs_url: z.string().trim().min(1).optional(),
  docsUrl: z.string().trim().min(1).optional(),
  photo_url: z.string().trim().min(1).optional(),
  photoUrl: z.string().trim().min(1).optional(),
  img_url: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
}).refine(
  (body) => body.file_url || body.docs_url || body.docsUrl || body.photo_url || body.photoUrl || body.img_url || body.description,
  "Dokumen, foto, atau deskripsi wajib diisi",
);

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
  const data = await prisma.secondFossibSessionSubmission.findUnique({ where: { userId } });
  return serverResponse({ success: true, message: "Berhasil mendapatkan submisi Fossib kedua", data });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return unauthorizedResponse();
  try {
    const raw = SubmissionSchema.parse(await req.json());
    const body = {
      file_url: raw.file_url ?? raw.docs_url ?? raw.docsUrl,
      photo_url: raw.photo_url ?? raw.photoUrl ?? raw.img_url,
      description: raw.description,
    };
    const data = await prisma.secondFossibSessionSubmission.upsert({
      where: { userId }, update: body, create: { ...body, userId },
    });
    return serverResponse({ success: true, message: "Submisi Fossib kedua tersimpan", data, status: 200 });
  } catch (error) {
    return serverResponse({ success: false, message: "Operasi gagal", error: error instanceof z.ZodError ? error.errors : "Body tidak valid", status: 400 });
  }
}
