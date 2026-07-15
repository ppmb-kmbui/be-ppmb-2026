import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import {
  googleDocsResourceId,
  isGoogleDriveResourceUrl,
  isImageUrl,
  isPdfUrl,
  urlResourceKey,
} from "@/utils/taskSubmission";
import { NextRequest } from "next/server";

const percentage = (completed: number, required: number) =>
  required === 0 ? 0 : Math.min(100, Math.round((completed / required) * 100));

const hasValue = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0;

// Temporary response keys for the current frontend. They no longer control
// task requirements and can be removed after the frontend adopts the new API.
const LEGACY_NETWORKING_BATCHES = [2026, 2025, 2024, 2023] as const;
const LEGACY_SENIOR_BATCHES = [2025, 2024, 2023] as const;

export async function GET(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  const networking = await prisma.networkingSubmission.findUnique({ where: { userId } });
  const fossib = await prisma.fossibSubmission.findUnique({ where: { userId } });
  const insightHunting = await prisma.insightHuntingSubmission.findUnique({ where: { userId } });
  const mentoring = await prisma.mentoringSubmission.findUnique({ where: { userId } });
  // Kept for legacy visibility only. Neither legacy model contributes to progress.
  const legacyMentoringVlog = await prisma.mentoringVlogSubmission.findUnique({ where: { userId } });
  const legacyMentoringReflection = await prisma.mentoringReflection.findUnique({ where: { userId } });
  const explorer = await prisma.explorerSubmission.findUnique({ where: { userId } });

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

  // These compatibility objects are still read by the current frontend. They no
  // longer represent the deleted per-batch networking quota model.
  const facultyProgress = {
    SAINTEK: { progress: 0, min: 0 },
    SOSHUM: { progress: 0, min: 0 },
    RIK_VOK: { progress: 0, min: 0 },
    OTHER: { progress: 0, min: 0 },
  };
  const progressByBatch: Record<string, { progress: number; min: number }> = Object.fromEntries(
    LEGACY_NETWORKING_BATCHES.map((batch, index) => [
      String(batch),
      { progress: index === 0 ? networkingCompleted : 0, min: index === 0 ? 2 : 0 },
    ]),
  );
  const seniorProgress: Record<string, { progress: number; min: number }> = Object.fromEntries(
    LEGACY_SENIOR_BATCHES.map((batch) => [String(batch), { progress: 0, min: 0 }]),
  );

  return serverResponse({
    success: true,
    message: "Berhasil mendapatkan tasks user",
    data: {
      networkingSubmission: networking,
      networkingAngkatan: { progress: facultyProgress, byBatch: progressByBatch, min: 2 },
      networkingKating: { progress: seniorProgress, min: 0 },
      kmbuiExplorerDone: explorerCompleted === 1,
      firstFossibDone: fossibCompleted === 1,
      secondFossibDone: fossibCompleted === 1,
      fossibDone: fossibCompleted === 1,
      insightHuntingDone: insightCompleted === 1,
      mentoringSubmission: mentoring,
      mentoringDone: mentoringCompleted === 1,
      mentoringVlogDone: !!legacyMentoringVlog,
      mentoringReflectionDone: !!legacyMentoringReflection,
      cards: {
        networking: { completed: networkingCompleted, required: 2, percentage: percentage(networkingCompleted, 2) },
        explorer: { completed: explorerCompleted, required: 1, percentage: percentage(explorerCompleted, 1) },
        mentoring: { completed: mentoringCompleted, required: 1, percentage: percentage(mentoringCompleted, 1) },
        fosterSiblings: { completed: fossibCompleted, required: 1, percentage: percentage(fossibCompleted, 1) },
        insightHunting: { completed: insightCompleted, required: 1, percentage: percentage(insightCompleted, 1) },
      },
    },
    status: 200,
  });
}
