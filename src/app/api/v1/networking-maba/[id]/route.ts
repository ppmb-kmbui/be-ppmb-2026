import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  const params = await props.params;
  const targetId = Number(params.id);

  if (!Number.isInteger(targetId) || targetId <= 0) {
    return serverResponse({ success: false, message: "Request tidak valid", error: "Target user tidak valid", status: 400 });
  }
  const connection = await prisma.networkingTask.findUnique({
    where: {
      fromId_toId: {
        fromId: userId,
        toId: targetId,
      },
    },
    include: {
      questions: {
        include: {
          question: true,
        },
      },
    },
  });

  if (!connection) {
    return serverResponse({success: false, message: "Data gagal diambil", error: "Anda belum melakukan networking dengan user ini!", status: 404});
  } else {
    return serverResponse({success: true, message: "Informasi berhasil diperoleh!", data: connection, status: 200})
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  const params = await props.params;
  const targetId = Number(params.id);

  if (!Number.isInteger(targetId) || targetId <= 0) {
    return serverResponse({ success: false, message: "Request tidak valid", error: "Target user tidak valid", status: 400 });
  }
  const connection = await prisma.connection.findFirst({
    where: {
      fromId: userId,
      toId: targetId,
    },
  });

  if (!connection) {
    return serverResponse({success: false, message: "Operasi gagal", error: "Anda tidak terhubung dengan user ini!", status: 400});
  }

  const networking = await prisma.networkingTask.findUnique({
    where: {
      fromId_toId: {
        fromId: userId,
        toId: targetId,
      },
    },
    include: {
      questions: {
        include: {
          question: true,
        },
      },
    },
  });

  if (networking) {
    return serverResponse({success: true, message: "Operasi gagal", error: "Anda sudah mendapat pertanyaan networking dengan user ini", status: 400})
  }

  const firstRandomQuestions = await prisma.question.findMany({
    where: {
      group_id: 1,
    }
  });

  if (firstRandomQuestions.length < 1) {
    return serverResponse({success: false, message: "Operasi gagal", error: "Pertanyaan dalam DB tidak cukup", status: 400});
  }

  const randomNumber: number = Math.floor(Math.random() * firstRandomQuestions.length);

  const q1 = firstRandomQuestions[randomNumber].id;

  const newTask = await prisma.networkingTask.create({
    data: {
      fromId: userId,
      toId: targetId,
    },
  });

  await prisma.questionTask.create({
    data: {
      fromId: newTask.fromId, 
      toId: newTask.toId, 
      questionId: q1
    },
  });

  const twoRandomQuestion = await prisma.question.findMany({
    where: {
      group_id: 2,
    },
  });

  if (twoRandomQuestion.length < 1) {
    return serverResponse({success: false, message: "Operasi gagal", error: "Pertanyaan dalam DB tidak cukup", status: 400});
  }

  let firstRandom: number = Math.floor(Math.random() * twoRandomQuestion.length) 
  let secondRandom: number = Math.floor(Math.random() * twoRandomQuestion.length) 
  secondRandom = (secondRandom === firstRandom) ? (secondRandom + 1) % twoRandomQuestion.length : secondRandom;

  await prisma.$transaction([
    prisma.questionTask.create({
      data: {
        fromId: newTask.fromId, 
        toId: newTask.toId, 
        questionId: twoRandomQuestion[firstRandom].id
      },
    }),
    prisma.questionTask.create({
      data: {
        fromId: newTask.fromId, 
        toId: newTask.toId, 
        questionId: twoRandomQuestion[secondRandom].id
      },
    })
  ]);

  const result = await prisma.networkingTask.findUnique({
    where: {
      fromId_toId: {
        fromId: userId,
        toId: targetId,
      },
    },
    include: {
      to: {
        omit: {
          password: true,
        },
      },
      from: {
        omit: {
          password: true,
        },
      },
      questions: {
        include: {
          question: true,
        },
      },
    },
  });
  return serverResponse({success: true, message: "Berhasil memperoleh pertanyaan networking", data: result, status: 200});
}

interface SubmitNetworkingTaskDTO {
  file_url?: string;
  pdf_url?: string;
  pdfUrl?: string;
  img_url?: string;
  description?: string;
  answers?: {
    questionId: number;
    answer: string;
  }[],
  secondary_answers?: {
    question: string,
    answer: string
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  const params = await props.params;
  const targetId = Number(params.id);

  if (!Number.isInteger(targetId) || targetId <= 0) {
    return serverResponse({ success: false, message: "Request tidak valid", error: "Target user tidak valid", status: 400 });
  }

  let body: SubmitNetworkingTaskDTO;
  try {
    body = (await req.json()) as SubmitNetworkingTaskDTO;
  } catch {
    return serverResponse({ success: false, message: "Request body tidak valid", error: "Body harus berupa JSON", status: 400 });
  }

  const canonicalFileUrl = body.file_url?.trim() || body.pdf_url?.trim() || body.pdfUrl?.trim() || undefined;
  const legacyImageUrl = body.img_url?.trim() || undefined;
  const attachmentData = canonicalFileUrl
    ? { file_url: canonicalFileUrl }
    : { img_url: legacyImageUrl! };
  const hasLegacyAnswers = !!body.answers?.length && !!body.secondary_answers;
  if (!canonicalFileUrl && !legacyImageUrl) {
    return serverResponse({success: false, message: "Request body tidak lengkap" ,error: "Pastikan file_url PDF diisi", status: 400});
  }
  const networking_tasks = await prisma.networkingTask.findFirst(
    {
      where: {
        fromId: userId,
        toId: targetId
      }, 
      select: {
        questions: true,
        is_done: true
      }
    }
  )

  const questions = networking_tasks?.questions;
  
  if (!questions) {
    return serverResponse({success: false, message: "Operasi gagal" ,error: "User belum melakukan networking dengan target user", status: 400});
  }

  if(networking_tasks.is_done) {
    return serverResponse({success: false, message: "Operasi gagal" ,error: "User sudah selesai networking dengan target user", status: 400});
  }

  if (!hasLegacyAnswers) {
    const res = await prisma.networkingTask.update({
      where: { fromId_toId: { fromId: userId, toId: targetId } },
      data: { ...attachmentData, description: body.description?.trim(), is_done: true },
      include: {
        to: { omit: { password: true } },
        from: { omit: { password: true } },
        questions: { include: { question: true } },
      },
    });
    await prisma.connection.updateMany({
      where: { fromId: userId, toId: targetId },
      data: { status: "done" },
    });
    return serverResponse({ success: true, message: "Berhasil submit networking", data: res, status: 200 });
  }

  if (questions.length !== body.answers!.length) {
    return serverResponse({success: false, message: "Request body tidak valid" ,error: "Banyak question tidak sama dengan template yang disediakan", status: 400});
  }

  if (
    body.answers!.some(
      ({ questionId }) =>
        !questions.map((q) => q.questionId).includes(questionId)
    )
  ) {
    return serverResponse({success: false, message: "Request body tidak valid" ,error: "Id question tidak sama dengan template yang disediakan", status: 400});
  }

  await prisma.$transaction(
    body.answers!.map(({ questionId, answer }) =>
      prisma.questionTask.update({
        where: {
          questionId_fromId_toId: {
            questionId,
            fromId: userId,
            toId: targetId,
          },
        },
        data: {
          answer,
        },
      })
    )
  );

  const user_question = await prisma.question.create({
    data: {
      question: body.secondary_answers!.question,
      group_id: -1
    }
  })

  await prisma.questionTask.create({
    data: {
      fromId: userId,
      toId: targetId,
      questionId: user_question.id,
      answer: body.secondary_answers!.answer,
    }
  });

  const res = await prisma.networkingTask.update({
    where: {
      fromId_toId: {
        fromId: userId,
        toId: targetId,
      },
    },
    data: {
      ...attachmentData,
      description: body.description?.trim(),
      is_done: true,
    },
    include: {
      to: {
        omit: {
          password: true,
        },
      },
      from: {
        omit: {
          password: true,
        },
      },
      questions: {
        include: {
          question: true,
        },
      },
    },
  });

  await prisma.connection.updateMany({
    where: {
      fromId: userId,
      toId: targetId,
    },
    data: {
      status: "done",
    },
  });
  return serverResponse({
    success: true, 
    message: "Berhasil submit networking",
    data: res,
    status: 200
  });
}


/**
 * @swagger
 * /api/v1/networking-maba/{id}:
 *   get:
 *     summary: Ambil detail networking maba dengan user tertentu
 *     description: |
 *       Endpoint ini membutuhkan JWT token pada header Authorization (format: Bearer &lt;token&gt;).
 *       Mengembalikan detail networking task dengan mahasiswa baru yang sudah dilakukan. Question bisa 3 atau 4, Jika 3 berati masih belum menjawab tapi 4 berati sudah menjawab karena user sudah memberikan optional question nya
 *     tags:
 *       - Networking Maba
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID target user untuk networking
 *     responses:
 *       200:
 *         description: Informasi berhasil diperoleh
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Informasi berhasil diperoleh!
 *                 data:
 *                   type: object
 *                   properties:
 *                     fromId:
 *                       type: integer
 *                       example: 1
 *                     toId:
 *                       type: integer
 *                       example: 2
 *                     img_url:
 *                       type: string
 *                       example: https://example.com/networking.jpg
 *                     is_done:
 *                       type: boolean
 *                       example: true
 *                     score:
 *                       type: integer
 *                       example: 85
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           questionId:
 *                             type: integer
 *                             example: 1
 *                           answer:
 *                             type: string
 *                             example: Jawaban pertanyaan
 *                           question:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               question:
 *                                 type: string
 *                                 example: Apa hobi kamu?
 *                 status:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Header tidak ditemukan
 *       404:
 *         description: Data tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Data gagal diambil
 *                 error:
 *                   type: string
 *                   example: Anda belum melakukan networking dengan user ini!
 *                 status:
 *                   type: integer
 *                   example: 404
 *  
 *   post:
 *     summary: Buat networking maba baru dengan user tertentu
 *     description: |
 *       Endpoint ini membutuhkan JWT token pada header Authorization (format: Bearer &lt;token&gt;).
 *       Membuat networking task baru dengan mahasiswa baru dan memberikan pertanyaan random. **Post selalu mengeluarkan 3 buah       question**
 *     tags:
 *       - Networking Maba
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID target user untuk networking
 *     responses:
 *       200:
 *         description: Berhasil memperoleh pertanyaan networking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Berhasil memperoleh pertanyaan networking
 *                 data:
 *                   type: object
 *                   properties:
 *                     fromId:
 *                       type: integer
 *                       example: 1
 *                     toId:
 *                       type: integer
 *                       example: 2
 *                     img_url:
 *                       type: string
 *                       example: null
 *                     is_done:
 *                       type: boolean
 *                       example: false
 *                     score:
 *                       type: integer
 *                       example: 0
 *                     to:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 2
 *                         email:
 *                           type: string
 *                           example: target@email.com
 *                         fullname:
 *                           type: string
 *                           example: Target User
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           questionId:
 *                             type: integer
 *                             example: 1
 *                           answer:
 *                             type: string
 *                             example: null
 *                           question:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               question:
 *                                 type: string
 *                                 example: Apa hobi kamu?
 *                 status:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Operasi gagal
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Operasi gagal
 *                 error:
 *                   type: string
 *                   example: Anda tidak terhubung dengan user ini!
 *                 status:
 *                   type: integer
 *                   example: 400
 * 
 *   put:
 *     summary: Submit jawaban networking maba
 *     description: |
 *       🚩 **Endpoint ini membutuhkan JWT token pada header Authorization (format: Bearer <token>).**
 *       Submit jawaban untuk networking task dengan mahasiswa baru. answers akan terdiri dari 3 questions
 *     tags:
 *       - Networking Maba
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID target user untuk networking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               img_url:
 *                 type: string
 *                 example: https://example.com/networking.jpg
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: integer
 *                       example: 1
 *                     answer:
 *                       type: string
 *                       example: Jawaban saya
 *               secondary_answers:
 *                 type: object
 *                 properties:
 *                   question:
 *                     type: string
 *                     example: Pertanyaan tambahan
 *                   answer:
 *                     type: string
 *                     example: Jawaban tambahan
 *     responses:
 *       200:
 *         description: Berhasil submit networking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Berhasil submit networking
 *                 data:
 *                   type: object
 *                   properties:
 *                     fromId:
 *                       type: integer
 *                       example: 1
 *                     toId:
 *                       type: integer
 *                       example: 2
 *                     img_url:
 *                       type: string
 *                       example: https://example.com/networking.jpg
 *                     is_done:
 *                       type: boolean
 *                       example: true
 *                     score:
 *                       type: integer
 *                       example: 0
 *                 status:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Request body tidak lengkap atau tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Request body tidak lengkap
 *                 error:
 *                   type: string
 *                   example: Pastikan img_url, answers dan secondary_answers tidak kosong
 *                 status:
 *                   type: integer
 *                   example: 400
 */
