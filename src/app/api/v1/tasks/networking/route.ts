import { authenticateRequest } from "@/lib/auth";
import { getNetworkingOverview } from "@/lib/networking";
import { taskOwnerGuard } from "@/lib/taskOwner";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  const ownerResponse = await taskOwnerGuard(userId);
  if (ownerResponse) return ownerResponse;

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
 *     description: Peserta 2026 dapat Networking langsung dengan angkatan 2023-2025. Target sesama 2026 harus sudah terhubung dua arah.
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data Networking berhasil didapatkan
 *       401:
 *         description: JWT tidak valid atau tidak ditemukan
 *       403:
 *         description: Hanya tersedia untuk peserta angkatan 2026
 */
