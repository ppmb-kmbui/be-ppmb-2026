import { prisma } from "@/lib/prisma";
import serverResponse from "@/utils/serverResponse";

export async function GET() {
  const categories = await prisma.materialCategory.findMany({
    orderBy: { position: "asc" },
    include: {
      materials: { where: { isPublished: true }, orderBy: { position: "asc" } },
    },
  });
  return serverResponse({ success: true, message: "Materi berhasil didapatkan", data: categories, status: 200 });
}
