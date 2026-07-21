import { prisma } from "@/lib/prisma";
import { getTaskOwner } from "@/lib/taskOwner";
import { isImageUrl } from "@/utils/taskSubmission";

export const NETWORKING_OWNER_BATCH = 2026;
export const NETWORKING_SENIOR_BATCHES = [2025, 2024, 2023] as const;

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
export const NETWORKING_PROFILE_ORDER = [
  { batch: "desc" },
  { fullname: "asc" },
  { id: "asc" },
] as const;
export const NETWORKING_QUESTION_TYPES = ["PEER", "SENIOR"] as const;
export const NETWORKING_FIXED_QUESTION_COUNTS = {
  PEER: 3,
  SENIOR: 5,
} as const;

export type NetworkingBatch = keyof typeof NETWORKING_BATCH_REQUIREMENTS;
export type NetworkingQuestionType = (typeof NETWORKING_QUESTION_TYPES)[number];
export type NetworkingType = "peer" | "senior";

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

export const isSeniorNetworkingBatch = (
  batch: number,
): batch is (typeof NETWORKING_SENIOR_BATCHES)[number] =>
  NETWORKING_SENIOR_BATCHES.some((seniorBatch) => seniorBatch === batch);

export function getQuestionTypeForBatch(
  batch: number,
): NetworkingQuestionType | null {
  if (batch === NETWORKING_OWNER_BATCH) return "PEER";
  if (isSeniorNetworkingBatch(batch)) return "SENIOR";
  return null;
}

export function isFriendshipPairAllowed(
  actor: { batch: number; isAdmin: boolean },
  target: { batch: number; isAdmin: boolean },
) {
  return !actor.isAdmin &&
    !target.isAdmin &&
    actor.batch === NETWORKING_OWNER_BATCH &&
    target.batch === NETWORKING_OWNER_BATCH;
}

export function canNetworkWithTarget(
  actor: { batch: number; isAdmin: boolean },
  targetBatch: number,
  hasMutualConnection: boolean,
) {
  if (actor.isAdmin || actor.batch !== NETWORKING_OWNER_BATCH) return false;
  const questionType = getQuestionTypeForBatch(targetBatch);
  return questionType === "SENIOR" ||
    (questionType === "PEER" && hasMutualConnection);
}

export function shouldApplyNetworkingDiscoverScope(
  viewer: { batch: number; isAdmin: boolean },
  scope: string,
) {
  return scope === "discover" &&
    !viewer.isAdmin &&
    viewer.batch === NETWORKING_OWNER_BATCH;
}

export function serializeNetworkingType(
  questionType: NetworkingQuestionType,
): NetworkingType {
  return questionType === "PEER" ? "peer" : "senior";
}

export function isValidNetworkingQuestionCatalog(
  questions: readonly { id: number; isCustom: boolean }[],
  questionType: NetworkingQuestionType,
) {
  const fixedCount = NETWORKING_FIXED_QUESTION_COUNTS[questionType];
  const expectedCount = fixedCount + 1;
  return questions.length === expectedCount &&
    new Set(questions.map(({ id }) => id)).size === expectedCount &&
    questions.filter(({ isCustom }) => !isCustom).length === fixedCount &&
    questions.filter(({ isCustom }) => isCustom).length === 1;
}

export async function getNetworkingOwner(userId: number) {
  return getTaskOwner(userId);
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

const networkingFriendSelect = {
  id: true,
  fullname: true,
  imgUrl: true,
  faculty: true,
  batch: true,
} as const;

export async function getEligibleNetworkingFriends(userId: number) {
  const friends = await prisma.user.findMany({
    where: {
      id: { not: userId },
      isAdmin: false,
      OR: [
        {
          batch: NETWORKING_OWNER_BATCH,
          ...mutualConnectionWhere(userId),
        },
        { batch: { in: [...NETWORKING_SENIOR_BATCHES] } },
      ],
    },
    select: networkingFriendSelect,
    orderBy: [...NETWORKING_PROFILE_ORDER],
  });

  return friends.map((friend) => ({
    ...friend,
    questionType: getQuestionTypeForBatch(friend.batch)!,
  }));
}

export async function getEligibleNetworkingFriend(userId: number, friendId: number) {
  const friend = await prisma.user.findFirst({
    where: {
      id: friendId,
      isAdmin: false,
      OR: [
        {
          batch: NETWORKING_OWNER_BATCH,
          ...mutualConnectionWhere(userId),
        },
        { batch: { in: [...NETWORKING_SENIOR_BATCHES] } },
      ],
    },
    select: networkingFriendSelect,
  });

  if (!friend) return null;
  const questionType = getQuestionTypeForBatch(friend.batch);
  return questionType ? { ...friend, questionType } : null;
}

export async function getNetworkingQuestions(questionType: NetworkingQuestionType) {
  return prisma.networkingQuestion.findMany({
    where: { isActive: true, questionType },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
}

export async function getNetworkingQuestionCatalogs() {
  const [peer, senior] = await Promise.all([
    getNetworkingQuestions("PEER"),
    getNetworkingQuestions("SENIOR"),
  ]);
  return { PEER: peer, SENIOR: senior };
}

export function serializeNetworkingQuestions(
  questions: Awaited<ReturnType<typeof getNetworkingQuestions>>,
) {
  return questions.map(({ id, code, prompt, position, isCustom, questionType }) => ({
    id,
    code,
    prompt,
    position,
    isCustom,
    networkingType: serializeNetworkingType(questionType),
  }));
}

export function serializeNetworkingFriend(
  friend: Awaited<ReturnType<typeof getEligibleNetworkingFriends>>[number],
) {
  const { questionType, ...profile } = friend;
  return {
    ...profile,
    networkingType: serializeNetworkingType(questionType),
  };
}

type SubmissionWithDetails = Awaited<ReturnType<typeof findNetworkingSubmissions>>[number];
type ActiveQuestionIdsByType = Record<NetworkingQuestionType, ReadonlySet<number>>;

export function isCompleteNetworkingSubmission(
  submission: SubmissionWithDetails,
  activeQuestionIds: ReadonlySet<number>,
) {
  if (activeQuestionIds.size === 0 || !isImageUrl(submission.photoUrl)) return false;

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
  const questionType = getQuestionTypeForBatch(submission.friend.batch);
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
    networkingType: questionType ? serializeNetworkingType(questionType) : null,
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
      friend: { select: networkingFriendSelect },
      answers: { include: { question: true } },
    },
    orderBy: [{ friend: { batch: "desc" } }, { friendId: "asc" }],
  });
}

export function calculateNetworkingProgress(
  submissions: SubmissionWithDetails[],
  activeQuestionIdsByType: ActiveQuestionIdsByType,
): NetworkingProgress {
  return calculateNetworkingProgressFromBatches(
    submissions
      .filter((submission) => {
        const questionType = getQuestionTypeForBatch(submission.friend.batch);
        return questionType && isCompleteNetworkingSubmission(
          submission,
          activeQuestionIdsByType[questionType],
        );
      })
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

export function emptyNetworkingProgress(): NetworkingProgress {
  return {
    completed: 0,
    required: 0,
    percentage: 0,
    byBatch: Object.fromEntries(
      Object.keys(NETWORKING_BATCH_REQUIREMENTS).map((batch) => [
        batch,
        { completed: 0, required: 0, percentage: 0 },
      ]),
    ),
  };
}

export async function getNetworkingOverview(userId: number) {
  const [owner, questionCatalogs] = await Promise.all([
    getNetworkingOwner(userId),
    getNetworkingQuestionCatalogs(),
  ]);
  const questionSets = {
    peer: serializeNetworkingQuestions(questionCatalogs.PEER),
    senior: serializeNetworkingQuestions(questionCatalogs.SENIOR),
  };

  if (!owner) {
    return {
      eligible: false,
      questionSets,
      friends: [],
      submissions: [],
      progress: emptyNetworkingProgress(),
    };
  }

  const friends = await getEligibleNetworkingFriends(userId);
  const submissions = await findNetworkingSubmissions(
    userId,
    friends.map(({ id }) => id),
  );
  const activeQuestionIdsByType: ActiveQuestionIdsByType = {
    PEER: new Set(
      isValidNetworkingQuestionCatalog(questionCatalogs.PEER, "PEER")
        ? questionCatalogs.PEER.map(({ id }) => id)
        : [],
    ),
    SENIOR: new Set(
      isValidNetworkingQuestionCatalog(questionCatalogs.SENIOR, "SENIOR")
        ? questionCatalogs.SENIOR.map(({ id }) => id)
        : [],
    ),
  };
  const completedFriendIds = new Set(
    submissions
      .filter((submission) => {
        const questionType = getQuestionTypeForBatch(submission.friend.batch);
        return questionType && isCompleteNetworkingSubmission(
          submission,
          activeQuestionIdsByType[questionType],
        );
      })
      .map(({ friendId }) => friendId),
  );

  return {
    eligible: true,
    questionSets,
    friends: friends.map((friend) => ({
      ...serializeNetworkingFriend(friend),
      completed: completedFriendIds.has(friend.id),
      updatedAt:
        submissions.find(({ friendId }) => friendId === friend.id)?.updatedAt ?? null,
    })),
    submissions: submissions.map(serializeNetworkingSubmission),
    progress: calculateNetworkingProgress(submissions, activeQuestionIdsByType),
  };
}
