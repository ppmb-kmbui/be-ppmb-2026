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

type AdminUserListRecord = {
  id: number;
  fullname: string | null;
  email: string;
  imgUrl: string | null;
  faculty: string | null;
  batch: number;
  NetworkingSubmission: { firstDocsUrl: string | null; secondDocsUrl: string | null } | null;
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

  const total = await prisma.user.count({ where });
  const users = await prisma.user.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { fullname: "asc" },
    select: {
      id: true, fullname: true, email: true, imgUrl: true, faculty: true, batch: true,
      NetworkingSubmission: {
        select: { firstDocsUrl: true, secondDocsUrl: true },
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
  }) as AdminUserListRecord[];

  const hasValue = (value: string | null | undefined) =>
    typeof value === "string" && value.trim().length > 0;

  const data = users.map((userRecord) => {
    const {
      NetworkingSubmission,
      ExplorerSubmission,
      MentoringSubmission,
      FossibSubmission,
      InsightHuntingSubmission,
      ...user
    } = userRecord;
    const firstDocumentId = googleDocsResourceId(NetworkingSubmission?.firstDocsUrl);
    const secondDocumentId = googleDocsResourceId(NetworkingSubmission?.secondDocsUrl);
    const networkingCompleted = Number(firstDocumentId !== null) + Number(
      secondDocumentId !== null && secondDocumentId !== firstDocumentId,
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
    const completed = networkingCompleted + explorerCompleted + mentoringCompleted +
      fossibCompleted + insightCompleted;

    return {
      ...user,
      progress: { completed, required: 6, percentage: Math.round((completed / 6) * 100) },
    };
  });

  return serverResponse({
    success: true,
    message: "Daftar peserta berhasil didapatkan",
    data: { users: data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    status: 200,
  });
}
