import { z } from "zod";

export const FACULTIES = [
  "Fasilkom",
  "FKM",
  "Fisip",
  "FKG",
  "FK",
  "FMIPA",
  "FT",
  "Vokasi",
  "FH",
  "FPsi",
  "FIA",
  "FF",
  "FIK",
  "FEB",
  "FIB",
  "Sastra Mesin",
] as const;

export type Faculty = (typeof FACULTIES)[number];

export const FacultySchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : value,
  z.enum(FACULTIES, {
    errorMap: () => ({
      message: "Fakultas tidak valid. Pilih salah satu fakultas yang tersedia",
    }),
  }),
);
