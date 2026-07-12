import { CLUSTERS, NETWORKING_BATCHES, SENIOR_BATCHES } from "@/lib/const";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";

const percentage = (completed: number, required: number) =>
  required === 0 ? 0 : Math.min(100, Math.round((completed / required) * 100));

export async function GET(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  const [networkingAngkatan, networkingKating, fossib1, fossib2, insightHunting, mentoringVlog, mentoringReflection, explorer] = await Promise.all([
    prisma.networkingTask.findMany({
      where: { is_done: true, fromId: userId },
      select: { to: { select: { faculty: true, batch: true } } },
    }),
    prisma.networkingKatingTask.findMany({
      where: {
        fromId: userId,
        OR: [{ file_url: { not: null } }, { img_url: { not: null } }],
      },
      select: { to: { select: { batch: true } } },
    }),
    prisma.firstFossibSessionSubmission.findUnique({ where: { userId } }),
    prisma.secondFossibSessionSubmission.findUnique({ where: { userId } }),
    prisma.insightHuntingSubmission.findUnique({ where: { userId } }),
    prisma.mentoringVlogSubmission.findUnique({ where: { userId } }),
    prisma.mentoringReflection.findUnique({ where: { userId } }),
    prisma.explorerSubmission.findUnique({ where: { userId } }),
  ]);

  const facultyProgress = {
    SAINTEK: { progress: 0, min: 3 },
    SOSHUM: { progress: 0, min: 3 },
    RIK_VOK: { progress: 0, min: 3 },
    OTHER: { progress: 0, min: 1 },
  };
  const progressByBatch: Record<string, { progress: number; min: number }> = Object.fromEntries(
    NETWORKING_BATCHES.map((batch) => [String(batch), { progress: 0, min: batch === NETWORKING_BATCHES[0] ? 10 : 0 }]),
  );

  for (const task of networkingAngkatan) {
    const faculty = task.to.faculty?.toUpperCase();
    if (faculty && CLUSTERS.SAINTEK.includes(faculty)) facultyProgress.SAINTEK.progress++;
    else if (faculty && CLUSTERS.SOSHUM.includes(faculty)) facultyProgress.SOSHUM.progress++;
    else if (faculty && CLUSTERS.RIK_VOK.includes(faculty)) facultyProgress.RIK_VOK.progress++;
    else facultyProgress.OTHER.progress++;
    const batch = String(task.to.batch);
    if (progressByBatch[batch]) progressByBatch[batch].progress++;
  }

  const seniorProgress: Record<string, { progress: number; min: number }> = Object.fromEntries(
    SENIOR_BATCHES.map((batch, index) => [String(batch), { progress: 0, min: index === 0 ? 4 : 3 }]),
  );
  for (const task of networkingKating) {
    const batch = String(task.to.batch);
    if (seniorProgress[batch]) seniorProgress[batch].progress++;
  }

  const networkingCompleted = networkingAngkatan.length + networkingKating.length;
  const mentoringSubmission = mentoringVlog ?? mentoringReflection;
  const mentoringCompleted = Number(!!mentoringSubmission);
  const fossibCompleted = Number(!!fossib1) + Number(!!fossib2) + Number(!!insightHunting);

  return serverResponse({
    success: true,
    message: "Berhasil mendapatkan tasks user",
    data: {
      networkingAngkatan: { progress: facultyProgress, byBatch: progressByBatch, min: 10 },
      networkingKating: { progress: seniorProgress, min: 10 },
      kmbuiExplorerDone: !!explorer,
      firstFossibDone: !!fossib1,
      secondFossibDone: !!fossib2,
      insightHuntingDone: !!insightHunting,
      mentoringDone: !!mentoringSubmission,
      mentoringVlogDone: !!mentoringVlog,
      mentoringReflectionDone: !!mentoringReflection,
      cards: {
        networking: { completed: networkingCompleted, required: 20, percentage: percentage(networkingCompleted, 20) },
        explorer: { completed: Number(!!explorer), required: 1, percentage: percentage(Number(!!explorer), 1) },
        mentoring: { completed: mentoringCompleted, required: 1, percentage: percentage(mentoringCompleted, 1) },
        fosterSiblings: { completed: fossibCompleted, required: 3, percentage: percentage(fossibCompleted, 3) },
      },
    },
    status: 200,
  });
}
