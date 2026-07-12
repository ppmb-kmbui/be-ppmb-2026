import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import serverResponse, { InvalidTargetUserResponse, unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";

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
 *     summary: Kirim permintaan koneksi ke user lain (pertemanan)
 *     tags:
 *       - Connect
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Header tidak ditemukan
 *       404:
 *         description: User tidak ditemukan
 *       409:
 *         description: Permintaan koneksi sudah ada atau user sudah mengirim permintaan ke Anda
 * 
 *   put:
 *     summary: Terima permintaan koneksi dari user lain
 *     tags:
 *       - Connect
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Header tidak ditemukan
 *       403:
 *         description: Connection Request tidak ditemukan
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
 *           type: string
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
 *         description: Header tidak ditemukan
 *       404:
 *         description: User tidak ditemukan
 */
