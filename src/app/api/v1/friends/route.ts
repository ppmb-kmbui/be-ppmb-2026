import { authenticateRequest } from "@/lib/auth";
import {
  NETWORKING_CONNECTION_STATUSES,
  NETWORKING_OWNER_BATCH,
  NETWORKING_PROFILE_ORDER,
  NETWORKING_SENIOR_BATCHES,
  canNetworkWithTarget,
  getQuestionTypeForBatch,
  serializeNetworkingType,
  shouldApplyNetworkingDiscoverScope,
} from "@/lib/networking";
import { prisma } from "@/lib/prisma";
import serverResponse, {
  InvalidUserResponse,
  unauthorizedResponse,
} from "@/utils/serverResponse";
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
  ConnectionSender: { status: string }[];
  ConnectionRequestReciever: { status: string }[];
  ConnectionRequestSender: { status: string }[];
};

type Viewer = { batch: number; isAdmin: boolean };

function serializeFriend(
  {
    ConnectionReciever,
    ConnectionSender,
    ConnectionRequestReciever,
    ConnectionRequestSender,
    ...profile
  }: FriendRecord,
  viewer: Viewer,
) {
  let status = "not_connected";
  if (ConnectionReciever.length) {
    status = ConnectionReciever[0].status;
  } else if (ConnectionRequestReciever.length) {
    status = "menunggu_konfirmasi";
  } else if (ConnectionRequestSender.length) {
    status = "meminta_konfirmasi";
  }

  const questionType = getQuestionTypeForBatch(profile.batch);
  const viewerCanNetwork = !viewer.isAdmin && viewer.batch === NETWORKING_OWNER_BATCH;
  const mutualConnection = ConnectionReciever.length > 0 && ConnectionSender.length > 0;

  return {
    ...profile,
    status,
    canConnect:
      viewerCanNetwork && profile.batch === NETWORKING_OWNER_BATCH,
    canNetwork: canNetworkWithTarget(viewer, profile.batch, mutualConnection),
    networkingType:
      viewerCanNetwork && questionType
        ? serializeNetworkingType(questionType)
        : null,
  };
}

function parseBatch(value: string | null) {
  if (value === null) return { batch: undefined, valid: true };
  const batch = Number(value);
  return {
    batch,
    valid: Number.isInteger(batch) && batch >= 2023 && batch <= NETWORKING_OWNER_BATCH,
  };
}

export async function GET(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }

  const viewer = await prisma.user.findUnique({
    where: { id: userId },
    select: { batch: true, isAdmin: true },
  });
  if (!viewer) return InvalidUserResponse;

  const searchParams = req.nextUrl.searchParams;
  const isPaginated = searchParams.has("page") || searchParams.has("limit");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(24, Math.max(1, Number(searchParams.get("limit")) || 12));
  const name = searchParams.get("name")?.trim();
  const parsedBatch = parseBatch(searchParams.get("batch"));
  const scope = searchParams.get("scope") ?? "all";

  if (!parsedBatch.valid || !["all", "discover"].includes(scope)) {
    return serverResponse({
      success: false,
      message: "Filter daftar profil tidak valid",
      error: "INVALID_FRIEND_FILTER",
      status: 400,
    });
  }

  const useDiscoverScope = shouldApplyNetworkingDiscoverScope(viewer, scope);

  const where = {
    id: { not: userId },
    isAdmin: false,
    ...(name ? { fullname: { contains: name, mode: "insensitive" as const } } : {}),
    ...(parsedBatch.batch ? { batch: parsedBatch.batch } : {}),
    ...(useDiscoverScope
      ? {
          OR: [
            // Kakak tingkat selalu dapat ditemukan untuk Networking langsung.
            { batch: { in: [...NETWORKING_SENIOR_BATCHES] } },
            {
              batch: NETWORKING_OWNER_BATCH,
              // Teman yang sudah terhubung berada di tab Teman Saya.
              ConnectionReciever: {
                none: {
                  fromId: userId,
                  status: { in: [...NETWORKING_CONNECTION_STATUSES] },
                },
              },
              ConnectionSender: {
                none: {
                  toId: userId,
                  status: { in: [...NETWORKING_CONNECTION_STATUSES] },
                },
              },
              // Request masuk ditampilkan pada panel konfirmasi, bukan discovery.
              ConnectionRequestSender: {
                none: { toId: userId, status: "pending" },
              },
            },
          ],
        }
      : {}),
  };
  const skip = isPaginated ? (page - 1) * limit : undefined;
  const take = isPaginated ? limit : undefined;

  try {
    const [total, friends] = await Promise.all([
      isPaginated ? prisma.user.count({ where }) : Promise.resolve(undefined),
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: [...NETWORKING_PROFILE_ORDER],
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
              status: { in: [...NETWORKING_CONNECTION_STATUSES] },
            },
            select: { status: true },
          },
          ConnectionSender: {
            where: {
              toId: userId,
              status: { in: [...NETWORKING_CONNECTION_STATUSES] },
            },
            select: { status: true },
          },
          ConnectionRequestReciever: {
            where: { fromId: userId, status: "pending" },
            select: { status: true },
          },
          ConnectionRequestSender: {
            where: { toId: userId, status: "pending" },
            select: { status: true },
          },
        },
      }),
    ]);

    return serverResponse({
      success: true,
      message: name
        ? `Daftar profil dengan nama ${name} berhasil didapatkan`
        : "Daftar profil berhasil didapatkan",
      data: {
        friends: (friends as FriendRecord[]).map((friend) =>
          serializeFriend(friend, viewer),
        ),
        ...(isPaginated
          ? {
              pagination: {
                page,
                limit,
                total: total ?? 0,
                totalPages: Math.ceil((total ?? 0) / limit),
              },
            }
          : {}),
      },
      status: 200,
    });
  } catch {
    return InvalidUserResponse;
  }
}

/**
 * @swagger
 * /api/v1/friends:
 *   get:
 *     summary: Ambil daftar profil peserta
 *     description: Mendukung filter `name`, `batch`, dan `scope=discover`. Scope discovery menyaring teman terhubung/request masuk sebelum pagination untuk viewer 2026, tanpa membatasi profile browsing pengguna lain.
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: batch
 *         schema: { type: integer, minimum: 2023, maximum: 2026 }
 *       - in: query
 *         name: scope
 *         schema: { type: string, enum: [all, discover], default: all }
 *     responses:
 *       200:
 *         description: Daftar profil berhasil didapatkan
 *       400:
 *         description: Filter angkatan tidak valid
 *       401:
 *         description: JWT tidak valid atau tidak ditemukan
 */
