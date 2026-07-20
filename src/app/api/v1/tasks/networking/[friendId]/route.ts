import { authenticateRequest } from "@/lib/auth";
import {
  getEligibleNetworkingFriend,
  getNetworkingOverview,
  getNetworkingQuestions,
  serializeNetworkingSubmission,
  serializeNetworkingQuestions,
} from "@/lib/networking";
import { NetworkingSubmissionSchema } from "@/lib/networkingContract";
import { prisma } from "@/lib/prisma";
import { taskDeadlineGuard } from "@/lib/taskDeadline";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { taskSubmissionErrorResponse } from "@/utils/taskSubmission";
import { NextRequest } from "next/server";

function parseFriendId(value: string) {
  const friendId = Number(value);
  return Number.isInteger(friendId) && friendId > 0 ? friendId : null;
}

async function ensureEligibleFriend(userId: number, friendId: number) {
  const target = await prisma.user.findUnique({
    where: { id: friendId },
    select: { id: true },
  });

  if (!target) {
    return {
      response: serverResponse({
        success: false,
        message: "Teman tidak ditemukan",
        error: "NETWORKING_FRIEND_NOT_FOUND",
        status: 404,
      }),
      friend: null,
    };
  }

  const friend = await getEligibleNetworkingFriend(userId, friendId);
  if (!friend) {
    return {
      response: serverResponse({
        success: false,
        message: "Networking hanya dapat dilakukan dengan teman yang sudah saling terhubung dari angkatan 2023-2026",
        error: "NETWORKING_FRIEND_NOT_ELIGIBLE",
        status: 403,
      }),
      friend: null,
    };
  }

  return { response: null, friend };
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ friendId: string }> },
) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  const friendId = parseFriendId((await props.params).friendId);
  if (!friendId) {
    return serverResponse({
      success: false,
      message: "ID teman tidak valid",
      error: "INVALID_FRIEND_ID",
      status: 400,
    });
  }

  const eligibility = await ensureEligibleFriend(userId, friendId);
  if (eligibility.response) return eligibility.response;

  const overview = await getNetworkingOverview(userId);

  return serverResponse({
    success: true,
    message: "Detail Networking berhasil didapatkan",
    data: {
      friend: eligibility.friend,
      questions: overview.questions,
      submission:
        overview.submissions.find(({ friend }) => friend.id === friendId) ?? null,
      progress: overview.progress,
    },
    status: 200,
  });
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ friendId: string }> },
) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  const deadlineResponse = taskDeadlineGuard("networking");
  if (deadlineResponse) return deadlineResponse;

  const friendId = parseFriendId((await props.params).friendId);
  if (!friendId) {
    return serverResponse({
      success: false,
      message: "ID teman tidak valid",
      error: "INVALID_FRIEND_ID",
      status: 400,
    });
  }

  try {
    const eligibility = await ensureEligibleFriend(userId, friendId);
    if (eligibility.response) return eligibility.response;

    const [body, questions] = await Promise.all([
      req.json().then((value) => NetworkingSubmissionSchema.parse(value)),
      getNetworkingQuestions(),
    ]);
    const fixedQuestions = questions.filter(({ isCustom }) => !isCustom);
    const customQuestions = questions.filter(({ isCustom }) => isCustom);

    if (fixedQuestions.length !== 3 || customQuestions.length !== 1) {
      console.error("Katalog pertanyaan Networking tidak valid", {
        fixed: fixedQuestions.length,
        custom: customQuestions.length,
      });
      return serverResponse({
        success: false,
        message: "Konfigurasi pertanyaan Networking belum tersedia",
        error: "NETWORKING_QUESTION_CONFIG_INVALID",
        status: 503,
      });
    }

    const expectedQuestionIds = new Set(fixedQuestions.map(({ id }) => id));
    const submittedQuestionIds = new Set(body.answers.map(({ question_id }) => question_id));
    if (
      expectedQuestionIds.size !== submittedQuestionIds.size ||
      [...expectedQuestionIds].some((id) => !submittedQuestionIds.has(id))
    ) {
      return serverResponse({
        success: false,
        message: "Validasi gagal",
        error: "Jawaban harus menggunakan seluruh ID pertanyaan tetap yang aktif",
        status: 400,
      });
    }

    const submission = await prisma.$transaction(async (transaction) => {
      const savedSubmission = await transaction.networkingSubmission.upsert({
        where: { userId_friendId: { userId, friendId } },
        update: { photoUrl: body.photo_url },
        create: { userId, friendId, photoUrl: body.photo_url },
      });

      await transaction.networkingAnswer.deleteMany({
        where: { submissionId: savedSubmission.id },
      });
      await transaction.networkingAnswer.createMany({
        data: [
          ...body.answers.map(({ question_id, answer }) => ({
            submissionId: savedSubmission.id,
            questionId: question_id,
            answer,
          })),
          {
            submissionId: savedSubmission.id,
            questionId: customQuestions[0].id,
            customQuestion: body.custom_question,
            answer: body.custom_answer,
          },
        ],
      });

      return transaction.networkingSubmission.findUniqueOrThrow({
        where: { id: savedSubmission.id },
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
      });
    });
    const overview = await getNetworkingOverview(userId);

    return serverResponse({
      success: true,
      message: "Jawaban Networking berhasil disimpan",
      data: {
        friend: eligibility.friend,
        questions: serializeNetworkingQuestions(questions),
        submission: serializeNetworkingSubmission(submission),
        progress: overview.progress,
      },
      status: 200,
    });
  } catch (error) {
    return taskSubmissionErrorResponse(error);
  }
}

/**
 * @swagger
 * /api/v1/tasks/networking/{friendId}:
 *   get:
 *     summary: Ambil jawaban Networking untuk satu teman
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: integer
 *   put:
 *     summary: Buat atau perbarui jawaban Networking untuk satu teman
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [photo_url, answers, custom_question, custom_answer]
 *             properties:
 *               photo_url:
 *                 type: string
 *                 format: uri
 *               answers:
 *                 type: array
 *                 minItems: 3
 *                 maxItems: 3
 *                 items:
 *                   type: object
 *                   required: [question_id, answer]
 *                   properties:
 *                     question_id:
 *                       type: integer
 *                     answer:
 *                       type: string
 *               custom_question:
 *                 type: string
 *               custom_answer:
 *                 type: string
 *     responses:
 *       200:
 *         description: Submission berhasil disimpan
 *       400:
 *         description: Payload atau ID tidak valid
 *       401:
 *         description: JWT tidak valid atau tidak ditemukan
 *       403:
 *         description: Deadline terlewati atau pertemanan tidak eligible
 */
