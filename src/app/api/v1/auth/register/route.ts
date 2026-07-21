import { NextRequest } from "next/server";
import { hash } from "bcrypt";
import { prisma } from "@/lib/prisma";
import { z, ZodError} from "zod";
import serverResponse from "@/utils/serverResponse";
import { isImageUrl } from "@/utils/taskSubmission";
import { ValidationError } from "@/types/api-type";
import { FacultySchema } from "@/lib/faculty";
import { CURRENT_BATCH } from "@/lib/const";

const UserSchema = z.object({
  fullname: z.string().trim().min(3, "Nama lengkap minimal 3 karakter"),
  lineId: z.string().trim().min(2, "ID Line wajib diisi"),
  whatsappNumber: z.string().trim().regex(/^(?:\+62|62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid"),
  email: z.string().trim().email("Tolong masukan email yang sesuai").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password minimal 8 karakter"),
  confirmPassword: z.string().min(8, "Konfirmasi password minimal 8 karakter"),
  imgUrl: z.string().trim().url("URL foto profil tidak valid").refine(
    (value) => isImageUrl(value),
    "Foto profil harus berupa URL gambar HTTPS",
  ),
  faculty: FacultySchema,
  batch: z.coerce
    .number()
    .int()
    .refine(
      (batch) => batch === CURRENT_BATCH,
      `Registrasi hanya tersedia untuk angkatan ${CURRENT_BATCH}`,
    ),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Konfirmasi password tidak sama",
});

function isPrismaKnownRequestError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return serverResponse({ success: false, message: "Validasi gagal", error: "Body JSON tidak valid", status: 400 });
  }
  try {
    const validateData = UserSchema.parse(body);
    const { confirmPassword: _confirmPassword, password, ...profile } = validateData;
    const user = await prisma.user.create({
      data: { ...profile, imgUrl: profile.imgUrl || null, password: await hash(password, 12) },
    });
    
    const {password: _storedPassword, ...responseData} = user;

    return serverResponse({success: true, message: "Berhasil membuat akun", data: responseData, status: 201})

  } catch (error) {
    if (error instanceof ZodError) {
      const zodErrors: ValidationError[] = error.errors.map((issue) => ({
        field: issue.path[0]?.toString() || "unknown",
        message: issue.message,
      }));

      return serverResponse({
        success: false,
        message: "Validasi gagal",
        error: zodErrors,
        status: 400,
      });
    }

    if (isPrismaKnownRequestError(error) && error.code === "P2002") {
      return serverResponse({
        success: false,
        message: "Email sudah digunakan",
        error: "DUPLICATE_EMAIL",
        status: 409,
      });
    }

    console.error("Registrasi user gagal", error);
    return serverResponse({
      success: false,
      message: "Terjadi kesalahan internal",
      error: "INTERNAL_SERVER_ERROR",
      status: 500,
    });
  }
}

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullname
 *               - lineId
 *               - whatsappNumber
 *               - email
 *               - password
 *               - confirmPassword
 *               - imgUrl
 *               - faculty
 *               - batch
 *             properties:
 *               fullname:
 *                 type: string
 *                 example: Danniel
 *               lineId:
 *                 type: string
 *                 example: danniel26
 *               whatsappNumber:
 *                 type: string
 *                 example: "081234567890"
 *               email:
 *                 type: string
 *                 example: Danniel@email.com
 *               password:
 *                 type: string
 *                 example: DannielSigma
 *               confirmPassword:
 *                 type: string
 *                 example: DannielSigma
 *               imgUrl:
 *                 type: string
 *                 example: https://example.com/avatar.jpg
 *               faculty:
 *                 type: string
 *                 enum: [Fasilkom, FKM, Fisip, FKG, FK, FMIPA, FT, Vokasi, FH, FPsi, FIA, FF, FIK, FEB, FIB, Sastra Mesin]
 *                 example: Fasilkom
 *               batch:
 *                 type: integer
 *                 enum: [2026]
 *                 example: 2026
 *     responses:
 *       201:
 *         description: Berhasil membuat akun
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
 *                   example: Berhasil membuat akun
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     fullname:
 *                       type: string
 *                       example: Danniel
 *                     email:
 *                       type: string
 *                       example: Danniel@email.com
 *                     imgUrl:
 *                       type: string
 *                       example: https://example.com/avatar.jpg
 *                     faculty:
 *                       type: string
 *                       enum: [Fasilkom, FKM, Fisip, FKG, FK, FMIPA, FT, Vokasi, FH, FPsi, FIA, FF, FIK, FEB, FIB, Sastra Mesin]
 *                       example: Fasilkom
 *                     batch:
 *                       type: integer
 *                       example: 2026
 *       400:
 *         description: Validasi gagal
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
 *                   example: Validasi gagal
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: email
 *                       message:
 *                         type: string
 *                         example: Tolong masukan email yang sesuai
 *                 status:
 *                   type: integer
 *                   example: 400
 *       409:
 *         description: Email sudah digunakan
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
 *                   example: Email sudah digunakan
 *                 error:
 *                   type: string
 *                   example: DUPLICATE_EMAIL
 *                 status:
 *                   type: integer
 *                   example: 409
 *       500:
 *         description: Terjadi kesalahan internal
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
 *                   example: Terjadi kesalahan internal
 *                 error:
 *                   type: string
 *                   example: INTERNAL_SERVER_ERROR
 *                 status:
 *                   type: integer
 *                   example: 500
 */
