import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { forbiddenResponse, unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";

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

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { fullname: "asc" },
      select: {
        id: true, fullname: true, email: true, imgUrl: true, faculty: true, batch: true,
        _count: {
          select: {
            NetworkingTaskSender: { where: { is_done: true } },
            NetworkingKatingTaskSender: {
              where: {
                OR: [
                  { file_url: { not: null } },
                  { img_url: { not: null } },
                ],
              },
            },
            ExplorerSubmission: true,
            MentoringVlogSubmission: true,
            MentoringReflection: true,
            FirstFossibSessionSubmission: true,
            SecondFossibSessionSubmission: true,
            InsightHuntingSubmission: true,
          },
        },
      },
    }),
  ]);

  const data = users.map(({ _count, ...user }) => {
    const completed = Math.min(20, _count.NetworkingTaskSender + _count.NetworkingKatingTaskSender) +
      Math.min(1, _count.ExplorerSubmission) +
      Math.min(1, _count.MentoringVlogSubmission + _count.MentoringReflection) +
      Math.min(3, _count.FirstFossibSessionSubmission + _count.SecondFossibSessionSubmission + _count.InsightHuntingSubmission);
    return { ...user, progress: { completed, required: 25, percentage: Math.round((completed / 25) * 100) } };
  });

  return serverResponse({
    success: true,
    message: "Daftar peserta berhasil didapatkan",
    data: { users: data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    status: 200,
  });
}
