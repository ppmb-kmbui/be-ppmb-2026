import { authenticateRequest } from "@/lib/auth";
import { getNetworkingOverview } from "@/lib/networking";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import {
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

export async function GET(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  const [
    networking,
    fossib,
    insightHunting,
    mentoring,
    legacyMentoringVlog,
    legacyMentoringReflection,
    explorer,
  ] = await Promise.all([
    getNetworkingOverview(userId),
    prisma.fossibSubmission.findUnique({ where: { userId } }),
    prisma.insightHuntingSubmission.findUnique({ where: { userId } }),
    prisma.mentoringSubmission.findUnique({ where: { userId } }),
    // Kept for legacy visibility only. Neither legacy model contributes to progress.
    prisma.mentoringVlogSubmission.findUnique({ where: { userId } }),
    prisma.mentoringReflection.findUnique({ where: { userId } }),
    prisma.explorerSubmission.findUnique({ where: { userId } }),
  ]);

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

  // Compatibility objects retain the legacy progress/min keys while reflecting
  // the canonical 2026/2025/2024/2023 quota contract.
  const facultyProgress = {
    SAINTEK: { progress: 0, min: 0 },
    SOSHUM: { progress: 0, min: 0 },
    RIK_VOK: { progress: 0, min: 0 },
    OTHER: { progress: 0, min: 0 },
  };
  const progressByBatch = Object.fromEntries(
    Object.entries(networking.progress.byBatch).map(([batch, item]) => [
      batch,
      { progress: item.completed, min: item.required, ...item },
    ]),
  );
  const seniorProgress = Object.fromEntries(
    ["2025", "2024", "2023"].map((batch) => [batch, progressByBatch[batch]]),
  );

  return serverResponse({
    success: true,
    message: "Berhasil mendapatkan tasks user",
    data: {
      networkingSubmission: networking.submissions,
      networkingAngkatan: {
        progress: progressByBatch["2026"].progress,
        faculty: facultyProgress,
        byBatch: progressByBatch,
        min: progressByBatch["2026"].min,
      },
      networkingKating: { progress: seniorProgress, min: 8 },
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
        networking: networking.progress,
        explorer: { completed: explorerCompleted, required: 1, percentage: percentage(explorerCompleted, 1) },
        mentoring: { completed: mentoringCompleted, required: 1, percentage: percentage(mentoringCompleted, 1) },
        fosterSiblings: { completed: fossibCompleted, required: 1, percentage: percentage(fossibCompleted, 1) },
        insightHunting: { completed: insightCompleted, required: 1, percentage: percentage(insightCompleted, 1) },
      },
    },
    status: 200,
  });
}
