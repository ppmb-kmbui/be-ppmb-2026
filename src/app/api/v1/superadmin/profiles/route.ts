import type { Prisma } from "@/generated/prisma/client";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";
import { z } from "zod";

const ProfilesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  batch: z.coerce.number().int().min(1900).max(2100).optional(),
  visibility: z.enum(["all", "visible", "hidden"]).default("all"),
});

const profileSelect = {
  id: true,
  email: true,
  fullname: true,
  imgUrl: true,
  faculty: true,
  batch: true,
  isProfileHidden: true,
} as const;

function superAdminRequiredResponse() {
  return serverResponse({
    success: false,
    message: "Forbidden",
    error: "Akses SUPERADMIN dibutuhkan",
    status: 403,
  });
}

export async function GET(req: NextRequest) {
  try {
    const identity = await authenticateRequest(req);
    if (!identity.isSuperAdmin) return superAdminRequiredResponse();
  } catch {
    return unauthorizedResponse();
  }

  const parsedQuery = ProfilesQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsedQuery.success) {
    return serverResponse({
      success: false,
      message: "Parameter daftar profil tidak valid",
      error: parsedQuery.error.errors.map((issue) => ({
        field: issue.path.join(".") || "query",
        message: issue.message,
      })),
      status: 400,
    });
  }

  const { page, limit, search, batch, visibility } = parsedQuery.data;
  const where: Prisma.UserWhereInput = {
    isAdmin: false,
    ...(batch !== undefined ? { batch } : {}),
    ...(visibility === "visible"
      ? { isProfileHidden: false }
      : visibility === "hidden"
        ? { isProfileHidden: true }
        : {}),
    ...(search
      ? {
          OR: [
            { fullname: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { faculty: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, profiles] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { batch: "desc" },
        { fullname: { sort: "asc", nulls: "last" } },
        { id: "asc" },
      ],
      select: profileSelect,
    }),
  ]);

  return serverResponse({
    success: true,
    message: "Daftar profil berhasil didapatkan",
    data: {
      profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    status: 200,
  });
}
