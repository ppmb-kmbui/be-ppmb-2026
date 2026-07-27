import { authenticateRequest } from "@/lib/auth";
import { CURRENT_BATCH } from "@/lib/const";
import {
  findNetworkingSubmissions,
  getNetworkingOverview,
  isNetworkingSubmissionProfileVisible,
  serializeNetworkingSubmission,
} from "@/lib/networking";
import { prisma } from "@/lib/prisma";
import { VISIBLE_PROFILE_WHERE } from "@/lib/profileVisibility";
import {
  serializeTaskReview,
  TASK_REVIEW_SLUGS,
  taskReviewTypeFromSlug,
} from "@/lib/taskReviewContract";
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
  let includeHiddenProfiles = false;
  try {
    const { isAdmin, isSuperAdmin } = await authenticateRequest(req);
    if (!isAdmin) return forbiddenResponse();
    includeHiddenProfiles = isSuperAdmin;
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await props.params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return serverResponse({ success: false, message: "Bad Request", error: "User ID tidak valid", status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      ...(!includeHiddenProfiles ? VISIBLE_PROFILE_WHERE : {}),
    },
    select: {
      id: true,
      fullname: true,
      email: true,
      imgUrl: true,
      faculty: true,
      batch: true,
      lineId: true,
      whatsappNumber: true,
      isAdmin: true,
    },
  });

  if (!user) {
    return serverResponse({ success: false, message: "User tidak ditemukan", error: "USER_NOT_FOUND", status: 404 });
  }

  if (user.isAdmin || user.batch !== CURRENT_BATCH) {
    return serverResponse({
      success: false,
      message: `Pengguna ini bukan peserta tugas PPMB ${CURRENT_BATCH}`,
      error: "USER_NOT_PPMB_2026_PARTICIPANT",
      status: 403,
    });
  }

  const { isAdmin: _isAdmin, ...participant } = user;

  const [
    networking,
    storedNetworkingSubmissions,
    fossib,
    insightHunting,
    mentoring,
    explorer,
    legacyMentoringVlog,
    legacyMentoringReflection,
    legacyFirstFossib,
    legacySecondFossib,
    taskReviews,
  ] = await Promise.all([
    getNetworkingOverview(userId),
    findNetworkingSubmissions(userId),
    prisma.fossibSubmission.findUnique({ where: { userId } }),
    prisma.insightHuntingSubmission.findUnique({ where: { userId } }),
    prisma.mentoringSubmission.findUnique({ where: { userId } }),
    prisma.explorerSubmission.findUnique({ where: { userId } }),
    prisma.mentoringVlogSubmission.findUnique({ where: { userId } }),
    prisma.mentoringReflection.findUnique({ where: { userId } }),
    prisma.firstFossibSessionSubmission.findUnique({ where: { userId } }),
    prisma.secondFossibSessionSubmission.findUnique({ where: { userId } }),
    prisma.taskReview.findMany({
      where: { participantId: userId },
      include: {
        reviewer: {
          select: { id: true, fullname: true, email: true },
        },
      },
    }),
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
  const networkingQuestions = [
    ...networking.questionSets.peer,
    ...networking.questionSets.senior,
  ];
  const networkingSubmissions = storedNetworkingSubmissions
    .filter(
      (submission) =>
        includeHiddenProfiles ||
        isNetworkingSubmissionProfileVisible(submission),
    )
    .map((submission) => {
      const serialized = serializeNetworkingSubmission(submission);
      const promptsByQuestionId = new Map(
        submission.answers.map(({ questionId, question }) => [questionId, question.prompt]),
      );
      return {
        ...serialized,
        answers: serialized.answers.map((answer) => ({
          ...answer,
          prompt: promptsByQuestionId.get(answer.questionId) ?? null,
        })),
      };
    });
  const reviews = Object.fromEntries(
    TASK_REVIEW_SLUGS.map((taskType) => {
      const databaseType = taskReviewTypeFromSlug(taskType);
      const review = taskReviews.find((item) => item.taskType === databaseType);
      return [taskType, review ? serializeTaskReview(review) : null];
    }),
  );

  return serverResponse({
    success: true,
    message: "Detail tugas user berhasil didapatkan",
    data: {
      user: participant,
      status,
      reviews,
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
        // Fetch independently from current friendship eligibility so historical
        // work remains reviewable if a connection changes. Hidden target
        // identities are removed for ordinary admins before serialization.
        networking: networkingSubmissions,
        // Flat catalog retained for older admin clients.
        networkingQuestions,
        networkingQuestionSets: networking.questionSets,
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
