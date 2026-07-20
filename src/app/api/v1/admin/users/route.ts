import { authenticateRequest } from "@/lib/auth";
import {
  NETWORKING_REQUIRED_TOTAL,
  NETWORKING_CONNECTION_STATUSES,
  calculateNetworkingProgressFromBatches,
  isValidNetworkingQuestionCatalog,
} from "@/lib/networking";
import { prisma } from "@/lib/prisma";
import serverResponse, { forbiddenResponse, unauthorizedResponse } from "@/utils/serverResponse";
import {
  isGoogleDriveResourceUrl,
  isImageUrl,
  isPdfUrl,
  urlResourceKey,
} from "@/utils/taskSubmission";
import { NextRequest } from "next/server";

type AdminUserListRecord = {
  id: number;
  fullname: string | null;
  email: string;
  imgUrl: string | null;
  faculty: string | null;
  batch: number;
  ConnectionSender: { toId: number }[];
  ConnectionReciever: { fromId: number }[];
  NetworkingSubmissions: {
    photoUrl: string;
    friend: { id: number; batch: number };
    answers: {
      questionId: number;
      answer: string;
      customQuestion: string | null;
      question: { isCustom: boolean; isActive: boolean };
    }[];
  }[];
  ExplorerSubmission: { activityName: string | null; img_url: string }[];
  MentoringSubmission: { gdriveUrl: string } | null;
  FossibSubmission: { fileUrl: string; photoUrl: string } | null;
  InsightHuntingSubmission: { file_url: string }[];
};

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await authenticateRequest(req);
    if (!isAdmin) return forbiddenResponse();
  } catch {
    return unauthorizedResponse();
  }

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 20));
  const search = req.nextUrl.searchParams.get("search")?.trim();
  const where = {
    isAdmin: false,
    ...(search ? { fullname: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [total, activeQuestions, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.networkingQuestion.findMany({
      where: { isActive: true },
      select: { id: true, isCustom: true },
    }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { fullname: "asc" },
      select: {
        id: true, fullname: true, email: true, imgUrl: true, faculty: true, batch: true,
        ConnectionSender: {
          where: { status: { in: [...NETWORKING_CONNECTION_STATUSES] } },
          select: { toId: true },
        },
        ConnectionReciever: {
          where: { status: { in: [...NETWORKING_CONNECTION_STATUSES] } },
          select: { fromId: true },
        },
        NetworkingSubmissions: {
          select: {
            photoUrl: true,
            friend: { select: { id: true, batch: true } },
            answers: {
              select: {
                questionId: true,
                answer: true,
                customQuestion: true,
                question: { select: { isCustom: true, isActive: true } },
              },
            },
          },
        },
        ExplorerSubmission: {
          select: { activityName: true, img_url: true },
        },
        MentoringSubmission: {
          select: { gdriveUrl: true },
        },
        FossibSubmission: {
          select: { fileUrl: true, photoUrl: true },
        },
        InsightHuntingSubmission: {
          select: { file_url: true },
        },
      },
    }),
  ]) as [number, { id: number; isCustom: boolean }[], AdminUserListRecord[]];
  const validQuestionCatalog = isValidNetworkingQuestionCatalog(activeQuestions);
  const activeQuestionIds = new Set(
    validQuestionCatalog ? activeQuestions.map(({ id }) => id) : [],
  );

  const hasValue = (value: string | null | undefined) =>
    typeof value === "string" && value.trim().length > 0;

  const data = users.map((userRecord) => {
    const {
      NetworkingSubmissions,
      ConnectionSender,
      ConnectionReciever,
      ExplorerSubmission,
      MentoringSubmission,
      FossibSubmission,
      InsightHuntingSubmission,
      ...user
    } = userRecord;
    const incomingFriendIds = new Set(
      ConnectionReciever.map(({ fromId }) => fromId),
    );
    const mutualFriendIds = new Set(
      ConnectionSender
        .map(({ toId }) => toId)
        .filter((friendId) => incomingFriendIds.has(friendId)),
    );
    const completedNetworkingBatches = NetworkingSubmissions
      .filter((submission) => {
        if (
          !mutualFriendIds.has(submission.friend.id) ||
          !validQuestionCatalog ||
          !isImageUrl(submission.photoUrl)
        ) return false;
        const answersByQuestion = new Map(
          submission.answers
            .filter(({ question }) => question.isActive)
            .map((answer) => [answer.questionId, answer]),
        );
        return [...activeQuestionIds].every((questionId) => {
          const answer = answersByQuestion.get(questionId);
          return Boolean(
            answer?.answer.trim() &&
            (!answer.question.isCustom || answer.customQuestion?.trim()),
          );
        });
      })
      .map(({ friend }) => friend.batch);
    const networkingProgress = calculateNetworkingProgressFromBatches(
      completedNetworkingBatches,
    );
    const explorerCompleted = Number(ExplorerSubmission.some(
      (submission) => hasValue(submission.activityName) && isImageUrl(submission.img_url),
    ));
    const mentoringCompleted = Number(isGoogleDriveResourceUrl(MentoringSubmission?.gdriveUrl));
    const fossibCompleted = Number(
      isPdfUrl(FossibSubmission?.fileUrl ?? "") &&
      isImageUrl(FossibSubmission?.photoUrl ?? "") &&
      urlResourceKey(FossibSubmission?.fileUrl ?? "") !==
        urlResourceKey(FossibSubmission?.photoUrl ?? ""),
    );
    const insightCompleted = Number(InsightHuntingSubmission.some(
      (submission) => isPdfUrl(submission.file_url),
    ));
    const completed = networkingProgress.completed + explorerCompleted + mentoringCompleted +
      fossibCompleted + insightCompleted;
    const required = NETWORKING_REQUIRED_TOTAL + 4;

    return {
      ...user,
      progress: {
        completed,
        required,
        percentage: Math.round((completed / required) * 100),
      },
    };
  });

  return serverResponse({
    success: true,
    message: "Daftar peserta berhasil didapatkan",
    data: { users: data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    status: 200,
  });
}
