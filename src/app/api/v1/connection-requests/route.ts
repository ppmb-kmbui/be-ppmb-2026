import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import serverResponse, { InvalidHeadersResponse, InvalidUserResponse } from "@/utils/serverResponse";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("X-User-Id");
  if (!userId) {
    return InvalidHeadersResponse;
  }
  try{
    const connection_requests_recieved = await prisma.connectionRequest.findMany({
      where: {
        toId: +userId,
      },
      include: {
        from: {
          select: {
            id: true,
            email: true,
            fullname: true,
            faculty: true,
            imgUrl: true,
            batch: true,
          },
        },
      },
    });
    const connection_requests_sent = await prisma.connectionRequest.findMany({
      where: {
        fromId: +userId,
      },
      include: {
        to: {
          select: {
            id: true,
            email: true,
            fullname: true,
            faculty: true,
            imgUrl: true,
            batch: true,
          },
        },
      },
    });
    return serverResponse({success: true, message: "Succesfully retrieved all connection request", data: {received: connection_requests_recieved, sent: connection_requests_sent}, status: 200});
  } catch (error) {
    return InvalidUserResponse;
  }
}

/**
 * @swagger
 * /api/v1/connection-requests:
 *   get:
 *     summary: Ambil semua permintaan koneksi (dikirim & diterima)
 *     description: |
 *       Endpoint ini membutuhkan JWT token pada header Authorization (format: Bearer &lt;token&gt;).
 *       Token akan divalidasi oleh middleware, dan userId akan diambil dari JWT.
 *       Jika diberikan query `name`, maka hasil akan difilter berdasarkan nama.
 *     tags:
 *       - Connection-request
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil semua permintaan koneksi user (dikirim & diterima)
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
 *                   example: Succesfully retrieved all connection request
 *                 data:
 *                   type: object
 *                   properties:
 *                     received:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           from:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 2
 *                               email:
 *                                 type: string
 *                                 example: danniel@email.com
 *                               fullname:
 *                                 type: string
 *                                 example: Danniel
 *                               faculty:
 *                                 type: string
 *                                 example: Ilmu Komputer
 *                               imgUrl:
 *                                 type: string
 *                                 example: https://example.com/avatar.jpg
 *                           status:
 *                             type: string
 *                             example: pending
 *                     sent:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 2
 *                           to:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 3
 *                               email:
 *                                 type: string
 *                                 example: budi@email.com
 *                               fullname:
 *                                 type: string
 *                                 example: Budi
 *                               faculty:
 *                                 type: string
 *                                 example: Teknik
 *                               imgUrl:
 *                                 type: string
 *                                 example: https://example.com/avatar2.jpg
 *                           status:
 *                             type: string
 *                             example: pending
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
 *                   example: Invalid
 *                 error:
 *                   type: string
 *                   example: User tidak ditemukan
 *                 status:
 *                   type: integer
 *                   example: 404
 */
