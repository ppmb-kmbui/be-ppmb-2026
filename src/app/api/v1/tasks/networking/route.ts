import { authenticateRequest } from "@/lib/auth";
import { getNetworkingOverview } from "@/lib/networking";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  const overview = await getNetworkingOverview(userId);

  return serverResponse({
    success: true,
    message: "Data Networking berhasil didapatkan",
    data: overview,
    status: 200,
  });
}

/**
 * @swagger
 * /api/v1/tasks/networking:
 *   get:
 *     summary: Ambil teman eligible, pertanyaan, submission, dan progress Networking
 *     description: Hanya menampilkan teman batch 2023-2026 yang sudah terhubung dua arah.
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data Networking berhasil didapatkan
 *       401:
 *         description: JWT tidak valid atau tidak ditemukan
 */
