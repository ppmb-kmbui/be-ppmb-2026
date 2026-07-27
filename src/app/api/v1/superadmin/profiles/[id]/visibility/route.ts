import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";
import { z } from "zod";

const ProfileVisibilitySchema = z.object({
  hidden: z.boolean(),
}).strict();

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

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const identity = await authenticateRequest(req);
    if (!identity.isSuperAdmin) return superAdminRequiredResponse();
  } catch {
    return unauthorizedResponse();
  }

  const profileId = Number((await props.params).id);
  if (!Number.isInteger(profileId) || profileId <= 0) {
    return serverResponse({
      success: false,
      message: "ID profil tidak valid",
      error: "INVALID_PROFILE_ID",
      status: 400,
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return serverResponse({
      success: false,
      message: "Body JSON tidak valid",
      error: "INVALID_JSON_BODY",
      status: 400,
    });
  }

  const parsedBody = ProfileVisibilitySchema.safeParse(body);
  if (!parsedBody.success) {
    return serverResponse({
      success: false,
      message: "Status visibilitas tidak valid",
      error: parsedBody.error.errors.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
      status: 400,
    });
  }

  const target = await prisma.user.findUnique({
    where: { id: profileId },
    select: {
      ...profileSelect,
      isAdmin: true,
    },
  });
  if (!target) {
    return serverResponse({
      success: false,
      message: "Profil tidak ditemukan",
      error: "PROFILE_NOT_FOUND",
      status: 404,
    });
  }
  if (target.isAdmin) {
    return serverResponse({
      success: false,
      message: "Profil admin tidak dapat disembunyikan",
      error: "ADMIN_PROFILE_VISIBILITY_IMMUTABLE",
      status: 403,
    });
  }

  const { isAdmin: _isAdmin, ...currentProfile } = target;
  const profile = currentProfile.isProfileHidden === parsedBody.data.hidden
    ? currentProfile
    : await prisma.user.update({
        where: { id: profileId },
        data: { isProfileHidden: parsedBody.data.hidden },
        select: profileSelect,
      });

  return serverResponse({
    success: true,
    message: profile.isProfileHidden
      ? "Profil berhasil disembunyikan"
      : "Profil berhasil ditampilkan",
    data: profile,
    status: 200,
  });
}
