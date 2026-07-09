import { CLUSTERS, SENIOR_BATCHES } from "@/lib/const";
import { prisma } from "@/lib/prisma";
import serverResponse from "@/utils/serverResponse";
import { NextRequest } from "next/server";

export const maxDuration = 60;

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (req.headers.get("X-User-Admin") !== "true") {
    return serverResponse({ success: false, message: "Forbidden", error: "Akses admin dibutuhkan", status: 403 });
  }
  const { id } = await props.params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return serverResponse({ success: false, message: "Bad Request", error: "User ID tidak valid", status: 400 });
  }

  const [user, networkingAngkatan, networkingKating, fossib1, fossib2, insightHunting, mentoringReflection, mentoringVlog, explorer] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullname: true, email: true, imgUrl: true, faculty: true, batch: true, lineId: true, whatsappNumber: true },
    }),
    prisma.networkingTask.findMany({
      where: { fromId: userId },
      include: {
        to: { select: { id: true, fullname: true, batch: true, faculty: true, imgUrl: true } },
        questions: { include: { question: true } },
      },
    }),
    prisma.networkingKatingTask.findMany({
      where: { fromId: userId },
      include: { to: true, questions: { include: { question: true } } },
    }),
    prisma.firstFossibSessionSubmission.findUnique({ where: { userId } }),
    prisma.secondFossibSessionSubmission.findUnique({ where: { userId } }),
    prisma.insightHuntingSubmission.findUnique({ where: { userId } }),
    prisma.mentoringReflection.findUnique({ where: { userId } }),
    prisma.mentoringVlogSubmission.findUnique({ where: { userId } }),
    prisma.explorerSubmission.findUnique({ where: { userId } }),
  ]);

  if (!user) {
    return serverResponse({ success: false, message: "User tidak ditemukan", error: "USER_NOT_FOUND", status: 404 });
  }

  const facultyProgress = { SAINTEK: 0, SOSHUM: 0, RIK_VOK: 0, OTHER: 0 };
  for (const task of networkingAngkatan.filter((item) => item.is_done)) {
    const faculty = task.to.faculty?.toUpperCase();
    if (faculty && CLUSTERS.SAINTEK.includes(faculty)) facultyProgress.SAINTEK++;
    else if (faculty && CLUSTERS.SOSHUM.includes(faculty)) facultyProgress.SOSHUM++;
    else if (faculty && CLUSTERS.RIK_VOK.includes(faculty)) facultyProgress.RIK_VOK++;
    else facultyProgress.OTHER++;
  }
  const seniorProgress = Object.fromEntries(SENIOR_BATCHES.map((batch) => [batch, networkingKating.filter((item) => item.to.batch === batch).length]));
  const status = {
    networking: networkingAngkatan.some((item) => item.is_done) || networkingKating.length > 0,
    explorer: !!explorer,
    mentoring: !!mentoringReflection || !!mentoringVlog,
    fosterSiblings: !!fossib1 || !!fossib2 || !!insightHunting,
  };

  return serverResponse({
    success: true,
    message: "Detail tugas user berhasil didapatkan",
    data: {
      user,
      status,
      progress: { faculty: facultyProgress, senior: seniorProgress },
      submissions: {
        networking: { peers: networkingAngkatan, seniors: networkingKating },
        explorer,
        mentoring: { vlog: mentoringVlog, reflection: mentoringReflection },
        fosterSiblings: { first: fossib1, second: fossib2, insightHunting },
      },
    },
    status: 200,
  });
}
