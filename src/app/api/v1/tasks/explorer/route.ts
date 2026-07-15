import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { isImageUrl, taskSubmissionErrorResponse } from "@/utils/taskSubmission";
import { NextRequest } from "next/server";
import { z } from "zod";
import { taskDeadlineGuard } from "@/lib/taskDeadline";

const PhotoUrlSchema = z.string().trim().url("URL foto tidak valid").refine(
  (value) => isImageUrl(value),
  "Foto Explorer harus berupa URL gambar HTTPS",
);
const SubmissionSchema = z.object({
  activity_name: z.string().trim().min(1, "Nama aktivitas wajib diisi"),
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
  return serverResponse({
    success: true,
    message: "Berhasil memperoleh submission anda",
    data: data ? {
      id: data.id,
      userId: data.userId,
      activity_name: data.activityName,
      img_url: data.img_url,
      photo_url: data.img_url,
    } : null,
    status: 200,
  });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return unauthorizedResponse();

  const deadlineResponse = taskDeadlineGuard("explorer");
  if (deadlineResponse) return deadlineResponse;

  try {
    const raw = SubmissionSchema.parse(await req.json());
    const body = {
      activityName: raw.activity_name,
      img_url: raw.img_url ?? raw.photo_url ?? raw.photoUrl!,
    };
    const data = await prisma.explorerSubmission.upsert({
      where: { userId },
      update: body,
      create: { ...body, userId },
    });
    return serverResponse({
      success: true,
      message: "Submission KMBUI Explorer tersimpan",
      data: {
        id: data.id,
        userId: data.userId,
        activity_name: data.activityName,
        img_url: data.img_url,
        photo_url: data.img_url,
      },
      status: 200,
    });
  } catch (error) {
    return taskSubmissionErrorResponse(error);
  }
}
