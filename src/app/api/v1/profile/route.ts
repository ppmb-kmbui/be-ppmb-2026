import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { NextRequest } from "next/server";
import serverResponse, { InvalidUserResponse, unauthorizedResponse } from "@/utils/serverResponse";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  imgUrl: z.string().trim().min(1).optional(),
  fullname: z.string().trim().min(3).optional(),
  lineId: z.string().trim().min(2).optional(),
  whatsappNumber: z.string().trim().regex(/^(?:\+62|62|0)8\d{7,12}$/).optional(),
  faculty: z.string().trim().min(2).optional(),
}).refine((value) => Object.keys(value).length > 0, "Minimal satu field harus diisi");

export async function GET(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      _count: {
        select: {
          ConnectionReciever: true,
        },
      },
    },
    omit: {
      password: true,
    },
  });
  if (!user) {
    return InvalidUserResponse;
  }

  const { _count, ...rest } = user;

  return serverResponse({
    success: true,
    message: "Berhasil mengambil profil",
    data: {
      ...rest,
      followers: _count.ConnectionReciever,
    },
    status: 200,
  });
}

export async function PUT(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }
  let body: z.infer<typeof UpdateProfileSchema>;
  try {
    body = UpdateProfileSchema.parse(await req.json());
  } catch (error) {
    return serverResponse({
      success: false,
      message: "Gagal memperbarui profil",
      error: error instanceof z.ZodError ? error.errors : "Body tidak valid",
      status: 400,
    });
  }
  const user = await prisma.user.update({
    where: {
      id: userId,
    },
    data: body,
    omit: {
      password: true,
    },
  });
  return serverResponse({
    success: true,
    message: "Berhasil memperbarui profil",
    data: user,
    status: 200,
  });
}

/**
 * @swagger
 * /api/v1/profile:
 *   get:
 *     summary: Ambil profil user (dengan jumlah followers)
 *     description: Endpoint ini membutuhkan JWT token pada header Authorization. Token akan divalidasi oleh middleware, dan userId akan diambil dari JWT.
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil profil user
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
 *                   example: Berhasil mengambil profil
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 7
 *                     email:
 *                       type: string
 *                       example: dennis@gmail.com
 *                     fullname:
 *                       type: string
 *                       example: Dennis 25
 *                     imgUrl:
 *                       type: string
 *                       example: rickRolll
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-07-08T11:51:35.194Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-07-08T11:51:35.194Z"
 *                     faculty:
 *                       type: string
 *                       example: Computer Science
 *                     isAdmin:
 *                       type: boolean
 *                       example: false
 *                     batch:
 *                       type: integer
 *                       example: 2025
 *                     followers:
 *                       type: integer
 *                       example: 4
 *       401:
 *         description: Tidak diizinkan (JWT tidak valid atau header tidak ditemukan)
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
 *                   example: Tidak diizinkan
 *                 error:
 *                   type: string
 *                   example: JWT Token tidak valid
 *   put:
 *     summary: Update profil user (hanya imgUrl)
 *     description: Endpoint ini membutuhkan JWT token pada header Authorization. Hanya field imgUrl yang dapat diupdate.
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imgUrl:
 *                 type: string
 *                 example: https://example.com/avatar.jpg
 *     responses:
 *       200:
 *         description: Berhasil memperbarui profil user
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
 *                   example: Berhasil memperbarui profil
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 7
 *                     email:
 *                       type: string
 *                       example: dennis@gmail.com
 *                     fullname:
 *                       type: string
 *                       example: Dennis 25
 *                     imgUrl:
 *                       type: string
 *                       example: https://example.com/avatar.jpg
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-07-08T11:51:35.194Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-07-08T11:51:35.194Z"
 *                     faculty:
 *                       type: string
 *                       example: Computer Science
 *                     isAdmin:
 *                       type: boolean
 *                       example: false
 *                     batch:
 *                       type: integer
 *                       example: 2025
 *       400:
 *         description: Gagal memperbarui profil (imgUrl wajib diisi)
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
 *                   example: Gagal memperbarui profil
 *                 error:
 *                   type: string
 *                   example: imgUrl wajib
 */
