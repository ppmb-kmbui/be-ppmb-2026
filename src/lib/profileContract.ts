import { FacultySchema } from "@/lib/faculty";
import { isImageUrl } from "@/utils/taskSubmission";
import { z } from "zod";

export const UpdateProfileSchema = z.object({
  imgUrl: z
    .string()
    .trim()
    .url("URL foto profil tidak valid")
    .max(2048, "URL foto profil terlalu panjang")
    .refine(isImageUrl, "Foto profil harus berupa URL gambar HTTPS")
    .optional(),
  fullname: z.string().trim().min(3).optional(),
  lineId: z.string().trim().min(2).optional(),
  whatsappNumber: z.string().trim().regex(/^(?:\+62|62|0)8\d{7,12}$/).optional(),
  faculty: FacultySchema.optional(),
}).refine((value) => Object.keys(value).length > 0, "Minimal satu field harus diisi");
