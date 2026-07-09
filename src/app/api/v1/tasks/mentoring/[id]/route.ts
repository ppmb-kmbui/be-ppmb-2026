import { prisma } from "@/lib/prisma";
import serverResponse, { InvalidHeadersResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";
import { z } from "zod";

const VlogSchema = z.object({
  file_url: z.string().trim().min(1, "URL video wajib diisi"),
  description: z.string().trim().min(1).optional(),
});

const ReflectionSchema = z.object({
  file_url: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
}).refine((body) => body.file_url || body.description, "PDF atau deskripsi wajib diisi");

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const userId = req.headers.get("X-User-Id");
  if (!userId) return InvalidHeadersResponse;

  try {
    const raw = await req.json();
    if (id === "vlog") {
      const body = VlogSchema.parse(raw);
      const data = await prisma.mentoringVlogSubmission.upsert({
        where: { userId: +userId }, update: body, create: { ...body, userId: +userId },
      });
      return serverResponse({ success: true, message: "Vlog mentoring tersimpan", data, status: 200 });
    }
    if (id === "reflection") {
      const body = ReflectionSchema.parse(raw);
      const data = await prisma.mentoringReflection.upsert({
        where: { userId: +userId }, update: body, create: { ...body, userId: +userId },
      });
      return serverResponse({ success: true, message: "Refleksi mentoring tersimpan", data, status: 200 });
    }
    return serverResponse({ success: false, message: "Operasi gagal", error: "Jenis mentoring tidak ditemukan", status: 404 });
  } catch (error) {
    return serverResponse({ success: false, message: "Operasi gagal", error: error instanceof z.ZodError ? error.errors : "Body tidak valid", status: 400 });
  }
}
