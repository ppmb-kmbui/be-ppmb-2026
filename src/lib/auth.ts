import type { NextRequest } from "next/server";
import { getAccessToken, verifyAccessToken, type AuthIdentity } from "@/lib/authToken";
import { prisma } from "@/lib/prisma";

export type { AuthIdentity } from "@/lib/authToken";

export type AuthUserLoader = (
  userId: number,
) => Promise<{ id: number; isAdmin: boolean; isSuperAdmin: boolean } | null>;

async function loadCurrentAuthUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true, isSuperAdmin: true },
  });
}

export async function authenticateRequest(
  req: NextRequest,
  userLoader: AuthUserLoader = loadCurrentAuthUser,
): Promise<AuthIdentity> {
  const token = getAccessToken(req);
  if (!token) throw new Error("Token tidak ditemukan");
  const verified = await verifyAccessToken(token);
  const currentUser = await userLoader(verified.userId);
  if (!currentUser || currentUser.id !== verified.userId) {
    throw new Error("User token tidak ditemukan");
  }

  return {
    ...verified,
    userId: currentUser.id,
    // Authorization always follows current DB state. Token claims are never
    // trusted for privileged access because roles can change before expiry.
    isAdmin: currentUser.isAdmin,
    isSuperAdmin: currentUser.isSuperAdmin,
  };
}
