import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";
import { z } from "zod";

const VlogSchema = z.object({
  file_url: z.string().trim().min(1).optional(),
  gdrive_url: z.string().trim().min(1).optional(),
  gdriveUrl: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
}).refine((body) => body.file_url || body.gdrive_url || body.gdriveUrl, "Link Google Drive wajib diisi");

const ReflectionSchema = z.object({
  file_url: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
}).refine((body) => body.file_url || body.description, "PDF atau deskripsi wajib diisi");

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  try {
    const raw = await req.json();
    if (id === "vlog" || id === "submission" || id === "gdrive") {
      const parsed = VlogSchema.parse(raw);
      const body = {
        file_url: parsed.gdrive_url ?? parsed.gdriveUrl ?? parsed.file_url!,
        description: parsed.description,
      };
      const data = await prisma.mentoringVlogSubmission.upsert({
        where: { userId }, update: body, create: { ...body, userId },
      });
      return serverResponse({ success: true, message: "Vlog mentoring tersimpan", data, status: 200 });
    }
    if (id === "reflection") {
      const body = ReflectionSchema.parse(raw);
      const data = await prisma.mentoringReflection.upsert({
        where: { userId }, update: body, create: { ...body, userId },
      });
      return serverResponse({ success: true, message: "Refleksi mentoring tersimpan", data, status: 200 });
    }
    return serverResponse({ success: false, message: "Operasi gagal", error: "Jenis mentoring tidak ditemukan", status: 404 });
  } catch (error) {
    return serverResponse({ success: false, message: "Operasi gagal", error: error instanceof z.ZodError ? error.errors : "Body tidak valid", status: 400 });
  }
}
