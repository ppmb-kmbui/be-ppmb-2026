import { authenticateRequest } from "@/lib/auth";
import { CURRENT_BATCH } from "@/lib/const";
import { prisma } from "@/lib/prisma";
import { isTaskCompleteForReview } from "@/lib/taskReview";
import {
  parseTaskReviewSlug,
  serializeTaskReview,
  taskReviewTypeFromSlug,
  TaskReviewPayloadSchema,
} from "@/lib/taskReviewContract";
import serverResponse, {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/utils/serverResponse";
import { NextRequest } from "next/server";
import { ZodError } from "zod";

function parseParticipantId(value: string) {
  const participantId = Number(value);
  return Number.isInteger(participantId) && participantId > 0
    ? participantId
    : null;
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string; taskType: string }> },
) {
  let reviewerId: number;
  try {
    const identity = await authenticateRequest(req);
    if (!identity.isAdmin) return forbiddenResponse();
    reviewerId = identity.userId;
  } catch {
    return unauthorizedResponse();
  }

  const params = await props.params;
  const participantId = parseParticipantId(params.id);
  if (!participantId) {
    return serverResponse({
      success: false,
      message: "ID peserta tidak valid",
      error: "INVALID_PARTICIPANT_ID",
      status: 400,
    });
  }

  const taskTypeSlug = parseTaskReviewSlug(params.taskType);
  if (!taskTypeSlug) {
    return serverResponse({
      success: false,
      message: "Jenis tugas tidak valid",
      error: "INVALID_TASK_REVIEW_TYPE",
      status: 400,
    });
  }

  const participant = await prisma.user.findUnique({
    where: { id: participantId },
    select: { id: true, batch: true, isAdmin: true },
  });
  if (!participant) {
    return serverResponse({
      success: false,
      message: "Peserta tidak ditemukan",
      error: "PARTICIPANT_NOT_FOUND",
      status: 404,
    });
  }
  if (participant.isAdmin || participant.batch !== CURRENT_BATCH) {
    return serverResponse({
      success: false,
      message: `Penilaian hanya tersedia untuk peserta angkatan ${CURRENT_BATCH}`,
      error: "USER_NOT_PPMB_2026_PARTICIPANT",
      status: 403,
    });
  }

  try {
    const body = TaskReviewPayloadSchema.parse(await req.json());
    const taskType = taskReviewTypeFromSlug(taskTypeSlug);
    if (!await isTaskCompleteForReview(participantId, taskType)) {
      return serverResponse({
        success: false,
        message: "Tugas belum lengkap dan belum dapat dinilai",
        error: "TASK_SUBMISSION_INCOMPLETE",
        status: 409,
      });
    }

    const reviewedAt = new Date();
    const values = {
      score: body.score,
      feedback: body.feedback || null,
      reviewerId,
      reviewedAt,
    };
    const review = await prisma.taskReview.upsert({
      where: { participantId_taskType: { participantId, taskType } },
      update: values,
      create: { participantId, taskType, ...values },
      include: {
        reviewer: {
          select: { id: true, fullname: true, email: true },
        },
      },
    });

    return serverResponse({
      success: true,
      message: "Penilaian tugas berhasil disimpan",
      data: { review: serializeTaskReview(review) },
      status: 200,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return serverResponse({
        success: false,
        message: "Validasi gagal",
        error: "Body JSON tidak valid",
        status: 400,
      });
    }
    if (error instanceof ZodError) {
      return serverResponse({
        success: false,
        message: "Validasi gagal",
        error: error.errors.map((issue) => ({
          field: issue.path.join(".") || "body",
          message: issue.message,
        })),
        status: 400,
      });
    }

    console.error("Penilaian tugas gagal", error);
    return serverResponse({
      success: false,
      message: "Terjadi kesalahan internal",
      error: "INTERNAL_SERVER_ERROR",
      status: 500,
    });
  }
}
