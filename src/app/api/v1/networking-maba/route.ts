import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { NextRequest } from "next/server";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";

export async function GET(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  const conns = await prisma.networkingTask.findMany({
    where: {
      fromId: userId,
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
  return serverResponse({
    success: true,
    message: "Berhasil mengambil data networking maba",
    data: conns,
    status: 200,
  });
}

/**
 * @swagger
 * /api/v1/networking-maba:
 *   get:
 *     summary: Ambil daftar networking maba yang sudah dilakukan
 *     description: |
 *       Endpoint ini membutuhkan JWT token pada header Authorization (format: Bearer &lt;token&gt;).
 *       Token akan divalidasi oleh middleware, dan userId akan diambil dari JWT.
 *       Mengembalikan semua networking task yang sudah dilakukan oleh user dengan mahasiswa baru lainnya. 
 *     tags:
 *       - Networking Maba
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil data networking maba
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
 *                   example: Berhasil mengambil data networking maba
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fromId:
 *                         type: integer
 *                         example: 1
 *                       toId:
 *                         type: integer
 *                         example: 2
 *                       img_url:
 *                         type: string
 *                         example: https://example.com/networking.jpg
 *                       is_done:
 *                         type: boolean
 *                         example: true
 *                       score:
 *                         type: integer
 *                         example: 85
 *                       to:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 2
 *                           email:
 *                             type: string
 *                             example: target@email.com
 *                           fullname:
 *                             type: string
 *                             example: Target User
 *                           faculty:
 *                             type: string
 *                             example: Ilmu Komputer
 *                       questions:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             questionId:
 *                               type: integer
 *                               example: 1
 *                             answer:
 *                               type: string
 *                               example: Jawaban pertanyaan
 *                             question:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                   example: 1
 *                                 question:
 *                                   type: string
 *                                   example: Apa hobi kamu?
 *                 status:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Header tidak ditemukan
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
 *                   example: Not Authorized
 *                 error:
 *                   type: string
 *                   example: Headers tidak ditemukan
 *                 status:
 *                   type: integer
 *                   example: 400
 */
