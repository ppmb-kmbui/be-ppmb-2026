import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await authenticateRequest(req);
  } catch {
    return unauthorizedResponse();
  }

  const category = await prisma.materialCategory.findFirst({
    where: { name: { equals: "Video Panitia", mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      materials: {
        where: { isPublished: true },
        orderBy: { position: "asc" },
      },
    },
  });

  return serverResponse({
    success: true,
    message: "Video panitia berhasil didapatkan",
    data: category ?? { name: "Video Panitia", materials: [] },
    status: 200,
  });
}
