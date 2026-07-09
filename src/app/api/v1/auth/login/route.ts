import { prisma } from "@/lib/prisma";
import { compare } from "bcrypt";
import { NextRequest } from "next/server";
import serverResponse from "@/utils/serverResponse";
import * as jwt from "jose";
import { z } from "zod";
import { getJwtSecret } from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid").transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

/**
 * @swagger
 * /api/v1/auth/login:
 *  post:
 *    summary: Login user
 *    tags:
 *      - Auth
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *                example: danniel@email.com
 *              password:
 *                type: string
 *                example: dannielsigma
 *    responses:
 *      200:
 *        description: Login berhasil, returns JWT token
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                success:
 *                  type: boolean
 *                  example: true
 *                message:
 *                  type: string
 *                  example: Login berhasil
 *                data:
 *                  type: object
 *                  properties:
 *                    token:
 *                      type: string
 *                      example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                status:
 *                  type: integer
 *                  example: 200
 *      401:
 *        description: Email atau kata sandi tidak tepat
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                success:
 *                  type: boolean
 *                  example: false
 *                message:
 *                  type: string
 *                  example: Login gagal
 *                error:
 *                  type: string
 *                  example: Email atau kata sandi tidak tepat
 *                status:
 *                  type: integer
 *                  example: 401
 */

export async function POST(req: NextRequest) {
  try {
    const body = LoginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    const match = user ? await compare(body.password, user.password) : false;

    if (!user || !match) {
      return serverResponse({
        success: false,
        message: "Login gagal",
        error: "Email atau kata sandi tidak tepat",
        status: 401,
      });
    }

    const token = await new jwt.SignJWT({ is_admin: user.isAdmin })
      .setSubject(String(user.id))
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(getJwtSecret());

    const response = serverResponse({
      success: true,
      message: "Login berhasil",
      data: { token },
      status: 200,
    });
    response.cookies.set("ppmb_access_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return serverResponse({
        success: false,
        message: "Validasi gagal",
        error: error.errors.map((issue) => ({
          field: issue.path.join(".") || "body",
          message: issue.message,
        })),
        status: 400,
      });
    }
    return serverResponse({ success: false, message: "Login gagal", error: "Terjadi kesalahan internal", status: 500 });
  }
}
