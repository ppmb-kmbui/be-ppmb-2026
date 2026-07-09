import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import serverResponse, { InvalidUserResponse } from "@/utils/serverResponse";
import { authenticateRequest } from "@/lib/auth";
/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags:
 *       - Auth
 *     description: |
 *       Endpoint ini membutuhkan JWT valid melalui header Authorization (Bearer token) atau cookie HttpOnly. Header X-User-Id dari client tidak dipercaya.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile berhasil didapatkan
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
 *                   example: Profile berhasil didapatkan
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: danniel@email.com
 *                     name:
 *                       type: string
 *                       example: Danniel
 *                 status:
 *                   type: integer
 *                   example: 200
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

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticateRequest(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) return InvalidUserResponse;
    const { password: _password, ...profile } = user;
    return serverResponse({success: true, message: "Profile berhasil didapatkan", data: profile});
  } catch {
    return serverResponse({ success: false, message: "Tidak diizinkan", error: "JWT Token tidak valid", status: 401 });
  }
}
