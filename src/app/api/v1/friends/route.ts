import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import serverResponse, { InvalidUserResponse, unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";

type FriendRecord = {
  id: number;
  email: string;
  fullname: string | null;
  faculty: string | null;
  imgUrl: string | null;
  batch: number;
  lineId: string | null;
  whatsappNumber: string | null;
  ConnectionReciever: { status: string }[];
  ConnectionRequestReciever: { status: string }[];
  ConnectionRequestSender: { status: string }[];
};

function serializeFriend({
  ConnectionReciever,
  ConnectionRequestReciever,
  ConnectionRequestSender,
  ...rest
}: FriendRecord) {
  let status = "not_connected";
  if (ConnectionReciever.length) {
    status = ConnectionReciever[0].status;
  } else if (ConnectionRequestReciever.length) {
    status = "menunggu_konfirmasi";
  } else if (ConnectionRequestSender.length) {
    status = "meminta_konfirmasi";
  }
  return {
    ...rest,
    status,
  };
}

export async function GET(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }
  const searchParams = req.nextUrl.searchParams;
  const isPaginated = searchParams.has("page") || searchParams.has("limit");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(24, Math.max(1, Number(searchParams.get("limit")) || 12));
  const paginationArgs: { skip?: number; take?: number } = isPaginated
    ? { skip: (page - 1) * limit, take: limit }
    : {};

  if (!searchParams.get("name")) {
    try{
      const where = {
        id: {
          not: {
            equals: userId,
          },
        },
        ...(isPaginated
          ? {
              isAdmin: false,
              ConnectionReciever: {
                none: {
                  fromId: userId,
                },
              },
              ConnectionRequestSender: {
                none: {
                  toId: userId,
                },
              },
            }
          : {}),
      };
      const total = isPaginated ? await prisma.user.count({ where }) : undefined;
      const friends = await prisma.user.findMany({
        where,
        ...paginationArgs,
        select: {
          id: true,
          email: true,
          fullname: true,
          faculty: true,
          imgUrl: true,
          batch: true,
          lineId: true,
          whatsappNumber: true,
          ConnectionReciever: {
            where: {
              fromId: userId,
            },
            select: {
              status: true,
            },
          },
          ConnectionRequestReciever: {
            where: {
              fromId: userId,
            },
            select: {
              status: true,
            },
          },
          ConnectionRequestSender: {
            where: {
              toId: userId,
            },
            select: {
              status: true,
            },
          },
        },
      }) as FriendRecord[];

      const friends_response = {
          friends: friends.map(serializeFriend),
          ...(isPaginated
            ? { pagination: { page, limit, total: total ?? 0, totalPages: Math.ceil((total ?? 0) / limit) } }
            : {}),
        }
      return serverResponse({success: true, message: "Friends Succesfully retrieved", data: friends_response ,status: 200})
    } catch {
      return InvalidUserResponse;
    }
  }

  const name = searchParams.get("name")!.trim();
  const person = await prisma.user.findMany({
    where: { fullname: { contains: name, mode: "insensitive" } },
    select: { id: true },
  }) as { id: number }[];
  
  if (!person?.length) {
    return serverResponse({
      success: true,
      message: "Friends Succesfully retrieved but it is empty",
      data: isPaginated
        ? { friends: [], pagination: { page, limit, total: 0, totalPages: 0 } }
        : { friends: [] },
      status: 200,
    })
  }

  try {
    const where = {
      AND: [
        {
          id: {
            not: {
              equals: userId,
            },
          },
        },
        {
          id: {
            in: person.map(({ id }) => id),
          },
        },
        ...(isPaginated
          ? [
              {
                isAdmin: false,
              },
              {
                ConnectionReciever: {
                  none: {
                    fromId: userId,
                  },
                },
              },
              {
                ConnectionRequestSender: {
                  none: {
                    toId: userId,
                  },
                },
              },
            ]
          : []),
      ],
    };
    const total = isPaginated ? await prisma.user.count({ where }) : undefined;
    const friends = await prisma.user.findMany({
      where,
      ...paginationArgs,
      select: {
        id: true,
        email: true,
        fullname: true,
        faculty: true,
        imgUrl: true,
        batch: true,
        lineId: true,
        whatsappNumber: true,
        ConnectionReciever: {
          where: {
            fromId: userId,
          },
          select: {
            status: true,
          },
        },
        ConnectionRequestReciever: {
          where: {
            fromId: userId,
          },
          select: {
            status: true,
          },
        },
        ConnectionRequestSender: {
          where: {
            toId: userId,
          },
          select: {
            status: true,
          },
        },
      },
    }) as FriendRecord[];
    const friends_response = {
        friends: friends.map(serializeFriend),
        ...(isPaginated
          ? { pagination: { page, limit, total: total ?? 0, totalPages: Math.ceil((total ?? 0) / limit) } }
          : {}),
      };
    return serverResponse({success: true, message: `Friends Succesfully retrieved with name ${name}`, data: friends_response ,status: 200})
  } catch {
    return InvalidUserResponse;
  }
}

/**
 * @swagger
 * /api/v1/friends:
 *   get:
 *     summary: Ambil daftar teman (selain diri sendiri, bisa search by name)
 *     description: |
 *       Endpoint ini membutuhkan JWT token pada header Authorization (format: Bearer &lt;token&gt;).
 *       Token akan divalidasi oleh middleware, dan userId akan diambil dari JWT.
 *       Jika diberikan query `name`, maka hasil akan difilter berdasarkan nama.
 *     tags:
 *       - Friends
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         required: false
 *         schema:
 *           type: string
 *         description: Nama teman yang ingin dicari (opsional)
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar teman
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
 *                   example: Friends Succesfully retrieved
 *                 data:
 *                   type: object
 *                   properties:
 *                     friends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 2
 *                           email:
 *                             type: string
 *                             example: danniel@email.com
 *                           fullname:
 *                             type: string
 *                             example: Danniel
 *                           faculty:
 *                             type: string
 *                             example: Ilmu Komputer
 *                           imgUrl:
 *                             type: string
 *                             example: https://example.com/avatar.jpg
 *                           batch:
 *                             type: integer
 *                             example: 2023
 *                           status:
 *                             type: string
 *                             example: not_connected
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
