import { authenticateRequest } from "@/lib/auth";
import { NETWORKING_CONNECTION_STATUSES } from "@/lib/networking";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    await authenticateRequest(req);
  } catch {
    return unauthorizedResponse();
  }

  const targetId = Number((await props.params).id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return serverResponse({
      success: false,
      message: "ID profil tidak valid",
      error: "INVALID_PROFILE_ID",
      status: 400,
    });
  }

  const profile = await prisma.user.findFirst({
    where: { id: targetId, isAdmin: false },
    select: {
      id: true,
      fullname: true,
      imgUrl: true,
      faculty: true,
      batch: true,
      lineId: true,
      whatsappNumber: true,
      _count: {
        select: {
          ConnectionReciever: {
            where: { status: { in: [...NETWORKING_CONNECTION_STATUSES] } },
          },
        },
      },
    },
  });

  if (!profile) {
    return serverResponse({
      success: false,
      message: "Profil tidak ditemukan",
      error: "PROFILE_NOT_FOUND",
      status: 404,
    });
  }

  const { _count, ...data } = profile;
  return serverResponse({
    success: true,
    message: "Profil berhasil didapatkan",
    data: { ...data, followers: _count.ConnectionReciever },
    status: 200,
  });
}

/**
 * @swagger
 * /api/v1/profile/{id}:
 *   get:
 *     summary: Ambil profil publik peserta berdasarkan ID
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Profil berhasil didapatkan
 *       404:
 *         description: Profil tidak ditemukan
 */
