import { getNetworkingOverview, NETWORKING_REQUIRED_TOTAL } from "@/lib/networking";
import { prisma } from "@/lib/prisma";
import type { TaskReviewDatabaseType } from "@/lib/taskReviewContract";
import {
  isGoogleDriveResourceUrl,
  isImageUrl,
  isPdfUrl,
  urlResourceKey,
} from "@/utils/taskSubmission";

const hasValue = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0;

export async function isTaskCompleteForReview(
  participantId: number,
  taskType: TaskReviewDatabaseType,
) {
  switch (taskType) {
    case "NETWORKING": {
      const networking = await getNetworkingOverview(participantId);
      return networking.progress.required === NETWORKING_REQUIRED_TOTAL &&
        networking.progress.completed === NETWORKING_REQUIRED_TOTAL;
    }
    case "EXPLORER": {
      const submission = await prisma.explorerSubmission.findUnique({
        where: { userId: participantId },
      });
      return hasValue(submission?.activityName) &&
        isImageUrl(submission?.img_url ?? "");
    }
    case "MENTORING": {
      const submission = await prisma.mentoringSubmission.findUnique({
        where: { userId: participantId },
      });
      return isGoogleDriveResourceUrl(submission?.gdriveUrl);
    }
    case "FOSSIB": {
      const submission = await prisma.fossibSubmission.findUnique({
        where: { userId: participantId },
      });
      return isPdfUrl(submission?.fileUrl ?? "") &&
        isImageUrl(submission?.photoUrl ?? "") &&
        urlResourceKey(submission?.fileUrl ?? "") !==
          urlResourceKey(submission?.photoUrl ?? "");
    }
    case "INSIGHT_HUNTING": {
      const submission = await prisma.insightHuntingSubmission.findUnique({
        where: { userId: participantId },
      });
      return isPdfUrl(submission?.file_url ?? "");
    }
  }
}
