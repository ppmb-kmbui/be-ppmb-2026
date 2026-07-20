import { authenticateRequest } from "@/lib/auth";
import { getNetworkingOverview } from "@/lib/networking";
import { prisma } from "@/lib/prisma";
import serverResponse, { forbiddenResponse, unauthorizedResponse } from "@/utils/serverResponse";
import {
  isGoogleDriveResourceUrl,
  isImageUrl,
  isPdfUrl,
  urlResourceKey,
} from "@/utils/taskSubmission";
import { NextRequest } from "next/server";

export const maxDuration = 60;

const hasValue = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0;

const percentage = (completed: number, required: number) =>
  required === 0 ? 0 : Math.min(100, Math.round((completed / required) * 100));

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { isAdmin } = await authenticateRequest(req);
    if (!isAdmin) return forbiddenResponse();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await props.params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return serverResponse({ success: false, message: "Bad Request", error: "User ID tidak valid", status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullname: true, email: true, imgUrl: true, faculty: true, batch: true, lineId: true, whatsappNumber: true },
  });

  if (!user) {
    return serverResponse({ success: false, message: "User tidak ditemukan", error: "USER_NOT_FOUND", status: 404 });
  }

  const [
    networking,
    fossib,
    insightHunting,
    mentoring,
    explorer,
    legacyMentoringVlog,
    legacyMentoringReflection,
    legacyFirstFossib,
    legacySecondFossib,
  ] = await Promise.all([
    getNetworkingOverview(userId),
    prisma.fossibSubmission.findUnique({ where: { userId } }),
    prisma.insightHuntingSubmission.findUnique({ where: { userId } }),
    prisma.mentoringSubmission.findUnique({ where: { userId } }),
    prisma.explorerSubmission.findUnique({ where: { userId } }),
    prisma.mentoringVlogSubmission.findUnique({ where: { userId } }),
    prisma.mentoringReflection.findUnique({ where: { userId } }),
    prisma.firstFossibSessionSubmission.findUnique({ where: { userId } }),
    prisma.secondFossibSessionSubmission.findUnique({ where: { userId } }),
  ]);

  const networkingCompleted = networking.progress.completed;
  const explorerCompleted = Number(
    hasValue(explorer?.activityName) && isImageUrl(explorer?.img_url ?? ""),
  );
  const mentoringCompleted = Number(isGoogleDriveResourceUrl(mentoring?.gdriveUrl));
  const fossibCompleted = Number(
    isPdfUrl(fossib?.fileUrl ?? "") &&
    isImageUrl(fossib?.photoUrl ?? "") &&
    urlResourceKey(fossib?.fileUrl ?? "") !== urlResourceKey(fossib?.photoUrl ?? ""),
  );
  const insightCompleted = Number(isPdfUrl(insightHunting?.file_url ?? ""));
  const completed = networkingCompleted + explorerCompleted + mentoringCompleted +
    fossibCompleted + insightCompleted;
  const overallRequired = networking.progress.required + 4;

  const status = {
    networking: networkingCompleted === networking.progress.required,
    explorer: explorerCompleted === 1,
    mentoring: mentoringCompleted === 1,
    fosterSiblings: fossibCompleted === 1,
    insightHunting: insightCompleted === 1,
  };

  return serverResponse({
    success: true,
    message: "Detail tugas user berhasil didapatkan",
    data: {
      user,
      status,
      progress: {
        networking: {
          completed: networkingCompleted,
          required: networking.progress.required,
          percentage: networking.progress.percentage,
          byBatch: networking.progress.byBatch,
        },
        explorer: {
          completed: explorerCompleted,
          required: 1,
          percentage: percentage(explorerCompleted, 1),
        },
        mentoring: {
          completed: mentoringCompleted,
          required: 1,
          percentage: percentage(mentoringCompleted, 1),
        },
        fossib: {
          completed: fossibCompleted,
          required: 1,
          percentage: percentage(fossibCompleted, 1),
        },
        insightHunting: {
          completed: insightCompleted,
          required: 1,
          percentage: percentage(insightCompleted, 1),
        },
        overall: {
          completed,
          required: overallRequired,
          percentage: percentage(completed, overallRequired),
        },
        // Compatibility keys retained for clients that still deserialize them.
        faculty: { "2026": networking.progress.byBatch["2026"] },
        senior: {
          "2025": networking.progress.byBatch["2025"],
          "2024": networking.progress.byBatch["2024"],
          "2023": networking.progress.byBatch["2023"],
        },
      },
      submissions: {
        networking: networking.submissions.map((submission) => ({
          ...submission,
          answers: submission.answers.map((answer) => ({
            ...answer,
            prompt: networking.questions.find(({ id }) => id === answer.questionId)?.prompt ?? null,
          })),
        })),
        networkingQuestions: networking.questions,
        explorer,
        mentoring: { submission: mentoring, gdrive_url: mentoring?.gdriveUrl ?? null },
        fossib,
        insightHunting,
        fosterSiblings: { submission: fossib, insightHunting },
        legacy: {
          mentoringVlog: legacyMentoringVlog,
          mentoringReflection: legacyMentoringReflection,
          firstFossibSession: legacyFirstFossib,
          secondFossibSession: legacySecondFossib,
        },
      },
    },
    status: 200,
  });
}
