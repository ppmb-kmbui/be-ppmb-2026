import { prisma } from "@/lib/prisma";
import serverResponse from "@/utils/serverResponse";

export async function GET() {
  const [timeline, faqs, sponsors] = await Promise.all([
    prisma.timelineEvent.findMany({ where: { isPublished: true }, orderBy: [{ position: "asc" }, { startsAt: "asc" }] }),
    prisma.faq.findMany({ where: { isPublished: true }, orderBy: { position: "asc" } }),
    prisma.sponsor.findMany({ where: { isPublished: true }, orderBy: { position: "asc" } }),
  ]);
  return serverResponse({ success: true, message: "Konten beranda berhasil didapatkan", data: { timeline, faqs, sponsors }, status: 200 });
}
