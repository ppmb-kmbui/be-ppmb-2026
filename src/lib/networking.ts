import { prisma } from "@/lib/prisma";
import { isImageUrl } from "@/utils/taskSubmission";

export const NETWORKING_BATCH_REQUIREMENTS = {
  2026: 10,
  2025: 4,
  2024: 2,
  2023: 2,
} as const;

export const NETWORKING_REQUIRED_TOTAL = Object.values(
  NETWORKING_BATCH_REQUIREMENTS,
).reduce((total, required) => total + required, 0);

export const NETWORKING_CONNECTION_STATUSES = ["accepted", "done"] as const;

export type NetworkingBatch = keyof typeof NETWORKING_BATCH_REQUIREMENTS;

export type NetworkingProgress = {
  completed: number;
  required: number;
  percentage: number;
  byBatch: Record<
    string,
    { completed: number; required: number; percentage: number }
  >;
};

const percentage = (completed: number, required: number) =>
  required === 0 ? 0 : Math.min(100, Math.round((completed / required) * 100));

export const isNetworkingBatch = (batch: number): batch is NetworkingBatch =>
  Object.prototype.hasOwnProperty.call(NETWORKING_BATCH_REQUIREMENTS, batch);

export function isValidNetworkingQuestionCatalog(
  questions: readonly { id: number; isCustom: boolean }[],
) {
  return questions.length === 4 &&
    new Set(questions.map(({ id }) => id)).size === 4 &&
    questions.filter(({ isCustom }) => !isCustom).length === 3 &&
    questions.filter(({ isCustom }) => isCustom).length === 1;
}

const mutualConnectionWhere = (userId: number) => ({
  ConnectionReciever: {
    some: {
      fromId: userId,
      status: { in: [...NETWORKING_CONNECTION_STATUSES] },
    },
  },
  ConnectionSender: {
    some: {
      toId: userId,
      status: { in: [...NETWORKING_CONNECTION_STATUSES] },
    },
  },
});

export async function getEligibleNetworkingFriends(userId: number) {
  return prisma.user.findMany({
    where: {
      id: { not: userId },
      isAdmin: false,
      batch: { in: Object.keys(NETWORKING_BATCH_REQUIREMENTS).map(Number) },
      ...mutualConnectionWhere(userId),
    },
    select: {
      id: true,
      fullname: true,
      imgUrl: true,
      faculty: true,
      batch: true,
    },
    orderBy: [{ batch: "desc" }, { fullname: "asc" }, { id: "asc" }],
  });
}

export async function getEligibleNetworkingFriend(userId: number, friendId: number) {
  return prisma.user.findFirst({
    where: {
      id: friendId,
      isAdmin: false,
      batch: { in: Object.keys(NETWORKING_BATCH_REQUIREMENTS).map(Number) },
      ...mutualConnectionWhere(userId),
    },
    select: {
      id: true,
      fullname: true,
      imgUrl: true,
      faculty: true,
      batch: true,
    },
  });
}

export async function getNetworkingQuestions() {
  return prisma.networkingQuestion.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
}

export function serializeNetworkingQuestions(
  questions: Awaited<ReturnType<typeof getNetworkingQuestions>>,
) {
  return questions.map(({ id, code, prompt, position, isCustom }) => ({
    id,
    code,
    prompt,
    position,
    isCustom,
  }));
}

type SubmissionWithDetails = Awaited<ReturnType<typeof findNetworkingSubmissions>>[number];

export function isCompleteNetworkingSubmission(
  submission: SubmissionWithDetails,
  activeQuestionIds: ReadonlySet<number>,
) {
  if (activeQuestionIds.size !== 4 || !isImageUrl(submission.photoUrl)) return false;

  const answersByQuestion = new Map(
    submission.answers.map((answer) => [answer.questionId, answer]),
  );

  return [...activeQuestionIds].every((questionId) => {
    const entry = answersByQuestion.get(questionId);
    if (!entry?.answer.trim()) return false;
    return !entry.question.isCustom || Boolean(entry.customQuestion?.trim());
  });
}

export function serializeNetworkingSubmission(submission: SubmissionWithDetails) {
  const answers = [...submission.answers]
    .sort((left, right) => left.question.position - right.question.position)
    .map(({ questionId, answer, customQuestion }) => ({
      questionId,
      answer,
      ...(customQuestion ? { customQuestion } : {}),
    }));

  return {
    id: submission.id,
    friend: submission.friend,
    photoUrl: submission.photoUrl,
    answers,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
}

export async function findNetworkingSubmissions(userId: number, friendIds?: number[]) {
  return prisma.networkingSubmission.findMany({
    where: {
      userId,
      ...(friendIds ? { friendId: { in: friendIds } } : {}),
    },
    include: {
      friend: {
        select: {
          id: true,
          fullname: true,
          imgUrl: true,
          faculty: true,
          batch: true,
        },
      },
      answers: { include: { question: true } },
    },
    orderBy: [{ friend: { batch: "desc" } }, { friendId: "asc" }],
  });
}

export function calculateNetworkingProgress(
  submissions: SubmissionWithDetails[],
  activeQuestionIds: ReadonlySet<number>,
): NetworkingProgress {
  return calculateNetworkingProgressFromBatches(
    submissions
      .filter((submission) =>
        isCompleteNetworkingSubmission(submission, activeQuestionIds),
      )
      .map(({ friend }) => friend.batch),
  );
}

export function calculateNetworkingProgressFromBatches(
  completedBatches: readonly number[],
): NetworkingProgress {
  const actualByBatch = new Map<number, number>();
  for (const batch of completedBatches) {
    if (!isNetworkingBatch(batch)) continue;
    actualByBatch.set(batch, (actualByBatch.get(batch) ?? 0) + 1);
  }

  const byBatch = Object.fromEntries(
    Object.entries(NETWORKING_BATCH_REQUIREMENTS).map(([batch, required]) => {
      const completed = Math.min(actualByBatch.get(Number(batch)) ?? 0, required);
      return [batch, { completed, required, percentage: percentage(completed, required) }];
    }),
  );
  const completed = Object.values(byBatch).reduce(
    (total, batchProgress) => total + batchProgress.completed,
    0,
  );

  return {
    completed,
    required: NETWORKING_REQUIRED_TOTAL,
    percentage: percentage(completed, NETWORKING_REQUIRED_TOTAL),
    byBatch,
  };
}

export async function getNetworkingOverview(userId: number) {
  const [questions, friends] = await Promise.all([
    getNetworkingQuestions(),
    getEligibleNetworkingFriends(userId),
  ]);
  const submissions = await findNetworkingSubmissions(
    userId,
    friends.map(({ id }) => id),
  );
  const activeQuestionIds = new Set(
    isValidNetworkingQuestionCatalog(questions)
      ? questions.map(({ id }) => id)
      : [],
  );
  const completedFriendIds = new Set(
    submissions
      .filter((submission) =>
        isCompleteNetworkingSubmission(submission, activeQuestionIds),
      )
      .map(({ friendId }) => friendId),
  );

  return {
    questions: serializeNetworkingQuestions(questions),
    friends: friends.map((friend) => ({
      ...friend,
      completed: completedFriendIds.has(friend.id),
      updatedAt:
        submissions.find(({ friendId }) => friendId === friend.id)?.updatedAt ?? null,
    })),
    submissions: submissions.map(serializeNetworkingSubmission),
    progress: calculateNetworkingProgress(submissions, activeQuestionIds),
  };
}
