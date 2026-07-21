import type { NextRequest } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

export type AuthIdentity = {
  userId: number;
  isAdmin: boolean;
  payload: JWTPayload;
};

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET belum dikonfigurasi");
  return new TextEncoder().encode(secret);
}

export function getAccessToken(req: NextRequest): string | null {
  const authorization = req.headers.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) {
    return bearerMatch[1].trim() || null;
  }
  return req.cookies.get("ppmb_access_token")?.value ?? null;
}

export async function verifyAccessToken(token: string): Promise<AuthIdentity> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  });
  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Subject token tidak valid");
  }
  return { userId, isAdmin: payload.is_admin === true, payload };
}
