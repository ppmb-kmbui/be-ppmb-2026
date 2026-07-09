import { NextRequest, NextResponse } from "next/server";
import * as jwt from "jose";
import serverResponse from "./utils/serverResponse";
import { getJwtSecret } from "./lib/auth";

const allowedOrigins = new Set([
  "https://ppmbkmbui.com",
  "https://www.ppmbkmbui.com",
]);

const publicRoutes = new Set([
  "/api/v1/config",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/logout",
]);

function applyCors(response: NextResponse, origin: string) {
  if (allowedOrigins.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export async function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";

  if (req.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    return applyCors(response, origin);
  }

  if (publicRoutes.has(req.nextUrl.pathname)) {
    return applyCors(NextResponse.next(), origin);
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.cookies.get("ppmb_access_token")?.value;

  try {
    if (!token) throw new Error("Token tidak ditemukan");
    const { payload } = await jwt.jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    if (!payload.sub) throw new Error("Subject token tidak ditemukan");

    const headers = new Headers(req.headers);
    headers.set("X-User-Id", payload.sub);
    headers.set("X-User-Admin", payload.is_admin === true ? "true" : "false");

    return applyCors(NextResponse.next({ request: { headers } }), origin);
  } catch {
    return applyCors(serverResponse({
      success: false,
      message: "Tidak diizinkan",
      error: "JWT Token tidak valid",
      status: 401,
    }), origin);
  }
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
