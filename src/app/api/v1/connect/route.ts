import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import serverResponse, { InvalidUserResponse, unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }
  try{
    const connections = await prisma.connection.findMany({
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
      },
    });
    return serverResponse({success: true, message: "Succesfully retrieved all connection", data: connections, status: 200});
  } catch (error) {
    return InvalidUserResponse;
  }
}

/**
 * @swagger
 * /api/v1/connect:
 *   get:
 *     summary: Ambil semua koneksi user (pertemanan)
 *     description: |
 *      Endpoint ini membutuhkan JWT token pada header Authorization(format: Bearer &lt;token&gt;). Token akan divalidasi oleh      middleware, dan userId akan diambil dari JWT.
 *     tags:
 *       - Connect
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil semua koneksi user
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
 *                   example: Succesfully retrieved all connection
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
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
