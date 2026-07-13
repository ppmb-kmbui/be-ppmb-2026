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

  const categories = await prisma.materialCategory.findMany({
    orderBy: { position: "asc" },
    include: {
      materials: { where: { isPublished: true }, orderBy: { position: "asc" } },
    },
  });
  return serverResponse({ success: true, message: "Materi berhasil didapatkan", data: categories, status: 200 });
}
