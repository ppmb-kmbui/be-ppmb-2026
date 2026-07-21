import { CURRENT_BATCH } from "@/lib/const";
import { prisma } from "@/lib/prisma";
import serverResponse from "@/utils/serverResponse";

export type TaskOwnerProfile = { batch: number; isAdmin: boolean };

export function isEligibleTaskOwner(profile: TaskOwnerProfile) {
  return !profile.isAdmin && profile.batch === CURRENT_BATCH;
}

export async function getTaskOwner(userId: number) {
  return prisma.user.findFirst({
    where: { id: userId, batch: CURRENT_BATCH, isAdmin: false },
    select: { id: true, batch: true },
  });
}

export function taskOwnerForbiddenResponse() {
  return serverResponse({
    success: false,
    message: `Fitur tugas hanya tersedia untuk peserta angkatan ${CURRENT_BATCH}`,
    error: "TASKS_FOR_2026_ONLY",
    status: 403,
  });
}

export async function taskOwnerGuard(userId: number) {
  return await getTaskOwner(userId) ? null : taskOwnerForbiddenResponse();
}
