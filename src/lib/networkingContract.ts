import { isImageUrl } from "@/utils/taskSubmission";
import { z } from "zod";

const PhotoUrlSchema = z
  .string()
  .trim()
  .url("URL foto dokumentasi tidak valid")
  .max(2048, "URL foto dokumentasi terlalu panjang")
  .refine(isImageUrl, "Foto dokumentasi harus berupa URL gambar HTTPS");

const AnswerSchema = z.object({
  question_id: z.number().int().positive("ID pertanyaan tidak valid"),
  answer: z.string().trim().min(1, "Jawaban wajib diisi").max(5000, "Jawaban terlalu panjang"),
}).strict();

export const NetworkingSubmissionSchema = z.object({
  photo_url: PhotoUrlSchema,
  answers: z
    .array(AnswerSchema)
    .length(3, "Jawaban untuk tiga pertanyaan tetap wajib diisi")
    .refine(
      (answers) => new Set(answers.map(({ question_id }) => question_id)).size === answers.length,
      "Pertanyaan yang sama tidak boleh dijawab lebih dari sekali",
    ),
  custom_question: z
    .string()
    .trim()
    .min(1, "Pertanyaan bebas wajib diisi")
    .max(500, "Pertanyaan bebas terlalu panjang"),
  custom_answer: z
    .string()
    .trim()
    .min(1, "Jawaban pertanyaan bebas wajib diisi")
    .max(5000, "Jawaban pertanyaan bebas terlalu panjang"),
}).strict();
