import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { NextRequest } from "next/server";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { z } from "zod";

const QuoteSchema = z.object({
  quote: z.string().trim().min(1, "Quote wajib diisi"),
});

export async function POST(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }
  let body: z.infer<typeof QuoteSchema>;
  try {
    body = QuoteSchema.parse(await req.json());
  } catch (error) {
    return serverResponse({
      success: false,
      message: "Validasi gagal",
      error: error instanceof z.ZodError ? error.errors : "Body JSON tidak valid",
      status: 400,
    });
  }

  const quote = await prisma.quotes.create({
    data: {
      quote: body.quote,
      userId,
    },
    include: {
      user: {
        omit: {
          password: true,
        },
      },
    },
  });
  return serverResponse({
    success: true,
    message: "Quote berhasil dibuat",
    data: quote,
    status: 201,
  });
}

export async function GET(req: NextRequest) {
  try {
    await authenticateRequest(req);
  } catch {
    return unauthorizedResponse();
  }

  const quotes = await prisma.quotes.findMany({
    include: {
      user: {
        omit: {
          password: true,
        },
      },
    },
  });

  if (quotes.length === 0) {
    return serverResponse({
      success: true,
      message: "Belum ada quote",
      data: null,
      status: 200,
    });
  }

  const randomNum = Math.floor(Math.random() * quotes.length);
  return serverResponse({
    success: true,
    message: "Quote berhasil didapatkan",
    data: quotes[randomNum],
    status: 200,
  });
}
