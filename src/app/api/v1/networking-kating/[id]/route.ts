import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";
import { CURRENT_BATCH } from "@/lib/const";

export async function GET(req: NextRequest, { params }: {params: Promise<{id: string}>}) {
    let userId: number;
    try {
        ({ userId } = await authenticateRequest(req));
    } catch {
        return unauthorizedResponse();
    }

    const targetId = Number((await params).id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
        return serverResponse({ success: false, message: "Request tidak valid", error: "Target kating tidak valid", status: 400 });
    }
    const response = await checkUser(userId, targetId);
    if (response !== null) return response;

    const networkingKating = await prisma.networkingKatingTask.findFirst({
        where: {
            fromId: userId,
            toId: targetId
        },
        include: {
            to: true,
            from: {
                omit: {
                    password: true,
                },
            },
            questions: true
        }
    });
    
    if (!networkingKating) {
        return serverResponse({success: false, message: "Operasi gagal", error: "Anda belum networking dari kating ini", status: 400});
    }

    return serverResponse({success: true, message: "Networking Kating berhasil didapatkan", data: networkingKating});
}

interface SubmitAnswerNetworkingKatingTaskDto {
    file_url?: string,
    pdf_url?: string,
    pdfUrl?: string,
    img_url?: string,
    description?: string,
    answers?: {
        answer: string
    } [],
    optionalAnswes?: {
        question: string,
        answer: string
    },
    optionalAnswers?: {
        question: string,
        answer: string
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    let userId: number;
    try {
        ({ userId } = await authenticateRequest(req));
    } catch {
        return unauthorizedResponse();
    }

    const targetId = Number((await params).id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
        return serverResponse({ success: false, message: "Request tidak valid", error: "Target kating tidak valid", status: 400 });
    }

    let body: SubmitAnswerNetworkingKatingTaskDto;
    try {
        body = await req.json();
    } catch {
        return serverResponse({
            success: false,
            message: "Operasi gagal",
            error: "Request body tidak valid",
            status: 400
        });
    }

    const template = {
        file_url: "string (URL PDF)",
        img_url: "string (legacy, opsional)",
        description: "string (opsional, sebagai pengganti answers)",
        answers: [{ answer: "string" }],
        optionalAnswers: { question: "string", answer: "string" }
    };

    const optionalAnswer = body.optionalAnswers ?? body.optionalAnswes;
    const canonicalFileUrl = body.file_url?.trim() || body.pdf_url?.trim() || body.pdfUrl?.trim() || undefined;
    const legacyImageUrl = body.img_url?.trim() || undefined;
    const attachmentData = canonicalFileUrl
        ? { file_url: canonicalFileUrl }
        : { img_url: legacyImageUrl! };
    const hasLegacyAnswers = body.answers?.length === 7 && !!optionalAnswer;

    if (!canonicalFileUrl && !legacyImageUrl) {
        return serverResponse({
            success: false,
            message: "Operasi gagal",
            error: "Request body tidak lengkap",
            data: { template },
            status: 400

        });
    }

    const userCheck = await checkUser(userId, targetId);
    if (userCheck !== null) {
        return userCheck;
    }

    const senior = await prisma.seniorUser.findFirst({ where: { id: targetId } });
    if (!senior) {
        return serverResponse({
            success: false,
            message: "Operasi gagal",
            error: "Kating tidak ditemukan",
            status: 400
        });
    }

    if (!hasLegacyAnswers) {
        const networkingKatingAnswer = await prisma.networkingKatingTask.upsert({
            where: { fromId_toId: { fromId: userId, toId: targetId } },
            update: { ...attachmentData, description: body.description?.trim() },
            create: { fromId: userId, toId: targetId, ...attachmentData, description: body.description?.trim() },
            include: {
                to: true,
                from: { omit: { password: true } },
                questions: { include: { question: true } },
            },
        });
        return serverResponse({ success: true, message: "Berhasil submit networking", data: networkingKatingAnswer, status: 200 });
    }
    
    await prisma.networkingKatingTask.upsert({
        where: {
            fromId_toId: {
                fromId: userId,
                toId: targetId
            }
        },
        update: {},
        create: {
            fromId: userId,
            toId: targetId
        }
    });

    const newQuestion = await prisma.questionKating.create({
        data: {
            question: optionalAnswer!.question,
            group_id: -1
        }
    });

    const questionTasks = [
        prisma.questionKatingTask.create({
            data: {
                fromId: userId,
                toId: targetId,
                questionId: newQuestion.id,
                answer: optionalAnswer!.answer
            }
        }),
        ...body.answers!.map((answerObj, idx) =>
            prisma.questionKatingTask.create({
                data: {
                    questionId: idx + 1,
                    fromId: userId,
                    toId: targetId,
                    answer: answerObj.answer,
                }
            })
        )
    ];

    await prisma.$transaction(questionTasks);

    const networkingKatingAnswer = await prisma.networkingKatingTask.update({
        where: {
            fromId_toId: {
                fromId: userId,
                toId: targetId
            }
        },
        data: { ...attachmentData, description: body.description?.trim() },
        include: {
            to: true,
            from: { omit: { password: true } },
            questions: { include: { question: true } }
        }
    });
    return serverResponse({
        success: true,
        message: "Berhasil submit networking",
        data: networkingKatingAnswer,
        status: 200
    });
}

async function checkUser(userId: number, targetId: number) {
    const user = await prisma.user.findFirst({
        where: {
            id: userId
        }
    });

    if (!user) {
        return serverResponse({success: false, message: "Operasi gagal", error: "User tidak ditemukan", status: 404});
    }

    if (user.batch !== CURRENT_BATCH) {
        return serverResponse({success: false, message: "Operasi gagal", error: `Khusus mahasiswa baru batch ${CURRENT_BATCH}`, status: 400});
    }

    return null;
}

/**
 * @swagger
 * /api/v1/networking-kating/{id}:
 *   get:
 *     summary: Ambil detail networking kating dengan user tertentu
 *     description: |
 *       Endpoint ini membutuhkan JWT token pada header Authorization (format: Bearer &lt;token&gt;).
 *       Mengembalikan detail networking task dengan kakak tingkat yang sudah dilakukan.
 *       Khusus untuk mahasiswa baru (batch 2025). Question bisa 7 atau 8, Jika 7 berati masih belum menjawab tapi 8 berati sudah menjawab karena user sudah memberikan optional question nya
 *     tags:
 *       - Networking Kating
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID target user (kakak tingkat) untuk networking
 *     responses:
 *       200:
 *         description: Networking Kating berhasil didapatkan
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
 *                   example: Networking Kating berhasil didapatkan
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
 *                     to:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 2
 *                         email:
 *                           type: string
 *                           example: kating@email.com
 *                         fullname:
 *                           type: string
 *                           example: Kakak Tingkat
 *                         faculty:
 *                           type: string
 *                           example: Ilmu Komputer
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
 *                   example: Anda belum mengambil pertanyaan dari kating ini
 *                 status:
 *                   type: integer
 *                   example: 400
 *       404:
 *         description: User tidak ditemukan
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
 *                   example: User tidak ditemukan
 *                 status:
 *                   type: integer
 *                   example: 404
 *
 *   post:
 *     summary: Buat networking kating baru dengan kakak tingkat
 *     description: |
 *       Endpoint ini membutuhkan JWT token pada header Authorization (format: Bearer &lt;token&gt;).
 *       Membuat networking task baru dengan kakak tingkat dan memberikan 7 pertanyaan tetap.
 *       Khusus untuk mahasiswa baru (batch 2025) yang sudah berteman dengan target user. Ada 7 pertanyaan di answers
 *     tags:
 *       - Networking Kating
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID target user (kakak tingkat) untuk networking
 *     responses:
 *       200:
 *         description: Networking kating berhasil dibuat
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
 *                   example: Networking kating berhasil dibuat
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
 *                           example: kating@email.com
 *                         fullname:
 *                           type: string
 *                           example: Kakak Tingkat
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
 *                   example: Anda belum berteman dengan user ini
 *                 status:
 *                   type: integer
 *                   example: 400
 *       500:
 *         description: Server error
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
 *                   example: Pertanyaan dalam DB tidak cukup
 *                 status:
 *                   type: integer
 *                   example: 500
 * 
 *   put:
 *     summary: Submit jawaban networking kating
 *     description: |
 *       Endpoint ini membutuhkan JWT token pada header Authorization (format: Bearer &lt;token&gt;).
 *       Submit jawaban untuk networking task dengan kakak tingkat.
 *       Khusus untuk mahasiswa baru (batch 2025). Ada 7 pertanyaan di answers
 *     tags:
 *       - Networking Kating
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID target user (kakak tingkat) untuk networking
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
 *                     answer:
 *                       type: string
 *                       example: Jawaban saya
 *                 minItems: 7
 *                 maxItems: 7
 *               optionalAnswes:
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
 *                   example: Operasi gagal
 *                 error:
 *                   type: string
 *                   example: Banyak pertanyaan seharusnya 7
 *                 data:
 *                   type: object
 *                   properties:
 *                     template:
 *                       type: object
 *                       properties:
 *                         img_url:
 *                           type: string
 *                           example: string
 *                         answers:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               answer:
 *                                 type: string
 *                                 example: string
 *                         optionalAnswes:
 *                           type: object
 *                           properties:
 *                             question:
 *                               type: string
 *                               example: string
 *                             answer:
 *                               type: string
 *                               example: string
 */
