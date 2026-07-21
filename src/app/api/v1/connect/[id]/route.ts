import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { isFriendshipPairAllowed } from "@/lib/networking";
import serverResponse, { InvalidTargetUserResponse, unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";

async function friendshipEligibility(userId: number, targetId: number) {
  if (userId === targetId) {
    return serverResponse({
      success: false,
      message: "Permintaan pertemanan tidak valid",
      error: "CANNOT_CONNECT_TO_SELF",
      status: 400,
    });
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [userId, targetId] } },
    select: { id: true, batch: true, isAdmin: true },
  });
  const actor = users.find(({ id }) => id === userId);
  const target = users.find(({ id }) => id === targetId);

  if (!target) return InvalidTargetUserResponse;
  if (!actor || !isFriendshipPairAllowed(actor, target)) {
    return serverResponse({
      success: false,
      message: "Pertemanan hanya tersedia antarpeserta angkatan 2026",
      error: "FRIENDSHIP_FOR_2026_ONLY",
      status: 403,
    });
  }

  return null;
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
    return serverResponse({ success: false, message: "Bad Request", error: "Target user ID tidak valid", status: 400 });
  }
  const eligibilityResponse = await friendshipEligibility(userId, targetId);
  if (eligibilityResponse) return eligibilityResponse;

  const connection = await prisma.connection.findFirst({
    where: {
      OR: [
        { fromId: userId, toId: targetId },
        { fromId: targetId, toId: userId },
      ],
      status: { in: ["accepted", "done"] },
    },
  });
  if (connection) {
    return serverResponse({
      success: false,
      message: "Pertemanan sudah terhubung",
      error: "ALREADY_CONNECTED",
      status: 409,
    });
  }
  const sent = await prisma.connectionRequest.findFirst({
    where: {
      fromId: userId,
      toId: targetId,
    },
  });

  if (sent) {
    return serverResponse({success: false, message: "Invalid Connection Attempt", error: "Connection request sudah dibuat", status: 409});
  }

  const recieved = await prisma.connectionRequest.findFirst({
    where: {
      fromId: targetId,
      toId: userId,
    },
  });

  if (recieved) {
    return serverResponse({success: false, message: "Invalid Connection Attempt", error: "User sudah mengirim connection request kepada Anda", status: 409});
  }
  
  const connectionRequest = await prisma.connectionRequest.create({
    data: {
      fromId: userId,
      toId: targetId,
      status: "pending",
    },
  });
  return serverResponse({
    success: true,
    message: "Connection Request berhasil dibuat",
    data: connectionRequest,
    status: 200
  });
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
    return serverResponse({ success: false, message: "Bad Request", error: "Target user ID tidak valid", status: 400 });
  }
  const eligibilityResponse = await friendshipEligibility(userId, targetId);
  if (eligibilityResponse) return eligibilityResponse;
  const connectionRequest = await prisma.connectionRequest.findFirst({
    where: {
      fromId: targetId,
      toId: userId,
      status: "pending"
    },
  })

  if (!connectionRequest) {
    return serverResponse({success: false, message: "Invalid Connection", error: "Connection Request tidak ditemukan", status: 403})
  }

  const transaction = await prisma.$transaction([
    prisma.connection.create({
      data: {
        fromId: userId,
        toId: targetId,
        status: "accepted",
      },
    }),
    prisma.connection.create({
      data: {
        fromId: targetId,
        toId: userId,
        status: "accepted",
      },
    }),
    prisma.connectionRequest.updateMany({
      where: {
        OR: [
          {
            fromId: userId,
            toId: targetId,
          },
          {
            fromId: targetId,
            toId: userId,
          },
        ],
      },
      data: {
        status: "accepted",
      },
    }),
  ]);
  const [connection1, connection2, _] = transaction;
  return serverResponse({success: true, message: "Connection succesful created", data: {connection1: connection1, connection2: connection2}, status: 200});
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }
  const params = await props.params;
  const targetId = Number(params.id);

  if (!Number.isInteger(targetId) || targetId <= 0) {
    return serverResponse({ success: false, message: "Bad Request", error: "Target user ID tidak valid", status: 400 });
  }
  const eligibilityResponse = await friendshipEligibility(userId, targetId);
  if (eligibilityResponse) return eligibilityResponse;
  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
  });

  if (!targetUser) {
    return InvalidTargetUserResponse;
  }

  let connr;
  try {
    connr = await prisma.connectionRequest.deleteMany({
      where: {
        fromId: targetId,
        toId: userId,
        status: {
          not: {
            equals: "accepted",
          },
        },
      }
    });
  } catch (error) {
    let errorMsg = "Unknown error";
    if (error instanceof Error) {
      errorMsg = error.message;
    }
    return serverResponse({
      success: false,
      message: `Failed to delete connection request: ${errorMsg}`,
      data: connr,
      status: 500
    });
  }
  return serverResponse({success: true, message: `Deleted Connection Request to ${targetUser.fullname}`, data: connr, status: 200});
}

/**
 * @swagger
 * /api/v1/connect/{id}:
 *   post:
 *     summary: Kirim permintaan pertemanan antarpeserta angkatan 2026
 *     tags:
 *       - Connect
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID target user yang ingin dikirimi permintaan koneksi
 *     responses:
 *       200:
 *         description: Permintaan koneksi berhasil dibuat
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
 *                   example: Connection Request berhasil dibuat
 *                 data:
 *                   type: object
 *                 status:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: ID target tidak valid atau target adalah diri sendiri
 *       401:
 *         description: JWT tidak valid atau tidak ditemukan
 *       403:
 *         description: Pertemanan hanya tersedia antarpeserta angkatan 2026
 *       404:
 *         description: User tidak ditemukan
 *       409:
 *         description: Permintaan koneksi sudah ada atau user sudah mengirim permintaan ke Anda
 * 
 *   put:
 *     summary: Terima permintaan pertemanan dari peserta angkatan 2026
 *     tags:
 *       - Connect
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID user yang mengirim permintaan koneksi
 *     responses:
 *       200:
 *         description: Koneksi berhasil dibuat
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
 *                   example: Connection succesful created
 *                 data:
 *                   type: object
 *                 status:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: ID target tidak valid
 *       401:
 *         description: JWT tidak valid atau tidak ditemukan
 *       403:
 *         description: Request tidak ditemukan atau pasangan bukan sesama angkatan 2026
 *       404:
 *         description: User tidak ditemukan
 * 
 *   delete:
 *     summary: Hapus permintaan koneksi yang dikirim ke user lain
 *     tags:
 *       - Connect
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID user yang mengirim permintaan koneksi
 *     responses:
 *       200:
 *         description: Permintaan koneksi berhasil dihapus
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
 *                   example: Deleted Connection Request to Danniel
 *                 data:
 *                   type: object
 *                 status:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: ID target tidak valid
 *       401:
 *         description: JWT tidak valid atau tidak ditemukan
 *       403:
 *         description: Pertemanan hanya tersedia antarpeserta angkatan 2026
 *       404:
 *         description: User tidak ditemukan
 */
