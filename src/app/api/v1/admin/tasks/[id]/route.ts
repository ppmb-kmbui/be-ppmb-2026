import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { forbiddenResponse, unauthorizedResponse } from "@/utils/serverResponse";
import {
  googleDocsResourceId,
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

  const networking = await prisma.networkingSubmission.findUnique({ where: { userId } });
  const fossib = await prisma.fossibSubmission.findUnique({ where: { userId } });
  const insightHunting = await prisma.insightHuntingSubmission.findUnique({ where: { userId } });
  const mentoring = await prisma.mentoringSubmission.findUnique({ where: { userId } });
  const explorer = await prisma.explorerSubmission.findUnique({ where: { userId } });
  const legacyMentoringVlog = await prisma.mentoringVlogSubmission.findUnique({ where: { userId } });
  const legacyMentoringReflection = await prisma.mentoringReflection.findUnique({ where: { userId } });
  const legacyFirstFossib = await prisma.firstFossibSessionSubmission.findUnique({ where: { userId } });
  const legacySecondFossib = await prisma.secondFossibSessionSubmission.findUnique({ where: { userId } });

  const firstDocumentId = googleDocsResourceId(networking?.firstDocsUrl);
  const secondDocumentId = googleDocsResourceId(networking?.secondDocsUrl);
  const networkingCompleted = Number(firstDocumentId !== null) + Number(
    secondDocumentId !== null && secondDocumentId !== firstDocumentId,
  );
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

  const status = {
    networking: networkingCompleted === 2,
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
          required: 2,
          percentage: percentage(networkingCompleted, 2),
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
        overall: { completed, required: 6, percentage: percentage(completed, 6) },
        // Compatibility keys retained for clients that still deserialize them.
        faculty: { SAINTEK: 0, SOSHUM: 0, RIK_VOK: 0, OTHER: 0 },
        senior: { "2025": 0, "2024": 0, "2023": 0 },
      },
      submissions: {
        networking,
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
