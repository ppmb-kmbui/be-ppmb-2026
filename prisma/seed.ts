import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL atau DATABASE_URL belum dikonfigurasi untuk seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const SEED_PASSWORD = "Password123!";
const SEED_IMAGE = "https://placehold.co/600x600/png";

async function seedUsers(passwordHash: string) {
  const admin = await prisma.user.upsert({
    where: { email: "admin@ppmb-kmbui.test" },
    update: {
      fullname: "Admin PPMB 2026",
      imgUrl: `${SEED_IMAGE}?text=Admin`,
      password: passwordHash,
      faculty: null,
      isAdmin: true,
      batch: 2026,
      lineId: "admin.ppmb26",
      whatsappNumber: "6281200000000",
    },
    create: {
      email: "admin@ppmb-kmbui.test",
      fullname: "Admin PPMB 2026",
      imgUrl: `${SEED_IMAGE}?text=Admin`,
      password: passwordHash,
      faculty: null,
      isAdmin: true,
      batch: 2026,
      lineId: "admin.ppmb26",
      whatsappNumber: "6281200000000",
    },
  });

  const nala = await prisma.user.upsert({
    where: { email: "nala.wijaya@example.com" },
    update: {
      fullname: "Nala Wijaya",
      imgUrl: `${SEED_IMAGE}?text=Nala`,
      password: passwordHash,
      faculty: "Fasilkom",
      isAdmin: false,
      batch: 2026,
      lineId: "nala.wijaya",
      whatsappNumber: "6281211111111",
    },
    create: {
      email: "nala.wijaya@example.com",
      fullname: "Nala Wijaya",
      imgUrl: `${SEED_IMAGE}?text=Nala`,
      password: passwordHash,
      faculty: "Fasilkom",
      isAdmin: false,
      batch: 2026,
      lineId: "nala.wijaya",
      whatsappNumber: "6281211111111",
    },
  });

  const bima = await prisma.user.upsert({
    where: { email: "bima.hartono@example.com" },
    update: {
      fullname: "Bima Hartono",
      imgUrl: `${SEED_IMAGE}?text=Bima`,
      password: passwordHash,
      faculty: "FEB",
      isAdmin: false,
      batch: 2026,
      lineId: "bimahartono",
      whatsappNumber: "6281222222222",
    },
    create: {
      email: "bima.hartono@example.com",
      fullname: "Bima Hartono",
      imgUrl: `${SEED_IMAGE}?text=Bima`,
      password: passwordHash,
      faculty: "FEB",
      isAdmin: false,
      batch: 2026,
      lineId: "bimahartono",
      whatsappNumber: "6281222222222",
    },
  });

  const citra = await prisma.user.upsert({
    where: { email: "citra.lestari@example.com" },
    update: {
      fullname: "Citra Lestari",
      imgUrl: `${SEED_IMAGE}?text=Citra`,
      password: passwordHash,
      faculty: "FPsi",
      isAdmin: false,
      batch: 2026,
      lineId: "citralestari",
      whatsappNumber: "6281233333333",
    },
    create: {
      email: "citra.lestari@example.com",
      fullname: "Citra Lestari",
      imgUrl: `${SEED_IMAGE}?text=Citra`,
      password: passwordHash,
      faculty: "FPsi",
      isAdmin: false,
      batch: 2026,
      lineId: "citralestari",
      whatsappNumber: "6281233333333",
    },
  });

  const darren = await prisma.user.upsert({
    where: { email: "darren.tan@example.com" },
    update: {
      fullname: "Darren Tan",
      imgUrl: `${SEED_IMAGE}?text=Darren`,
      password: passwordHash,
      faculty: "FT",
      isAdmin: false,
      batch: 2026,
      lineId: "darrentan",
      whatsappNumber: "6281244444444",
    },
    create: {
      email: "darren.tan@example.com",
      fullname: "Darren Tan",
      imgUrl: `${SEED_IMAGE}?text=Darren`,
      password: passwordHash,
      faculty: "FT",
      isAdmin: false,
      batch: 2026,
      lineId: "darrentan",
      whatsappNumber: "6281244444444",
    },
  });

  const arya = await prisma.user.upsert({
    where: { email: "arya.pratama.2025@example.com" },
    update: {
      fullname: "Arya Pratama",
      imgUrl: `${SEED_IMAGE}?text=Arya`,
      password: passwordHash,
      faculty: "FIB",
      isAdmin: false,
      batch: 2025,
      lineId: "aryapratama25",
      whatsappNumber: "6281255555555",
    },
    create: {
      email: "arya.pratama.2025@example.com",
      fullname: "Arya Pratama",
      imgUrl: `${SEED_IMAGE}?text=Arya`,
      password: passwordHash,
      faculty: "FIB",
      isAdmin: false,
      batch: 2025,
      lineId: "aryapratama25",
      whatsappNumber: "6281255555555",
    },
  });

  const kusuma = await prisma.user.upsert({
    where: { email: "kusuma.dewi.2024@example.com" },
    update: {
      fullname: "Kusuma Dewi",
      imgUrl: `${SEED_IMAGE}?text=Kusuma`,
      password: passwordHash,
      faculty: "FKM",
      isAdmin: false,
      batch: 2024,
      lineId: "kusumadewi24",
      whatsappNumber: "6281266666666",
    },
    create: {
      email: "kusuma.dewi.2024@example.com",
      fullname: "Kusuma Dewi",
      imgUrl: `${SEED_IMAGE}?text=Kusuma`,
      password: passwordHash,
      faculty: "FKM",
      isAdmin: false,
      batch: 2024,
      lineId: "kusumadewi24",
      whatsappNumber: "6281266666666",
    },
  });

  const metta = await prisma.user.upsert({
    where: { email: "metta.sari.2023@example.com" },
    update: {
      fullname: "Metta Sari",
      imgUrl: `${SEED_IMAGE}?text=Metta`,
      password: passwordHash,
      faculty: "FIK",
      isAdmin: false,
      batch: 2023,
      lineId: "mettasari23",
      whatsappNumber: "6281277777777",
    },
    create: {
      email: "metta.sari.2023@example.com",
      fullname: "Metta Sari",
      imgUrl: `${SEED_IMAGE}?text=Metta`,
      password: passwordHash,
      faculty: "FIK",
      isAdmin: false,
      batch: 2023,
      lineId: "mettasari23",
      whatsappNumber: "6281277777777",
    },
  });

  return { admin, nala, bima, citra, darren, arya, kusuma, metta };
}

async function ensureConnection(fromId: number, toId: number, status = "accepted") {
  const existing = await prisma.connection.findFirst({
    where: { fromId, toId },
  });

  if (existing) {
    return prisma.connection.update({
      where: { id: existing.id },
      data: { status },
    });
  }

  return prisma.connection.create({
    data: { fromId, toId, status },
  });
}

async function ensureConnectionRequest(fromId: number, toId: number, status = "pending") {
  const existing = await prisma.connectionRequest.findFirst({
    where: { fromId, toId },
  });

  if (existing) {
    return prisma.connectionRequest.update({
      where: { id: existing.id },
      data: { status },
    });
  }

  return prisma.connectionRequest.create({
    data: { fromId, toId, status },
  });
}

async function seedConnections(users: Awaited<ReturnType<typeof seedUsers>>) {
  await ensureConnection(users.nala.id, users.bima.id);
  await ensureConnection(users.bima.id, users.nala.id);
  await ensureConnection(users.citra.id, users.darren.id);
  await ensureConnection(users.darren.id, users.citra.id);
  await ensureConnection(users.nala.id, users.arya.id);
  await ensureConnection(users.arya.id, users.nala.id);
  await ensureConnection(users.nala.id, users.kusuma.id, "done");
  await ensureConnection(users.kusuma.id, users.nala.id, "done");
  await ensureConnection(users.nala.id, users.metta.id);
  await ensureConnection(users.metta.id, users.nala.id);
  await ensureConnectionRequest(users.citra.id, users.nala.id);
}

async function seedNetworkingSubmissions(users: Awaited<ReturnType<typeof seedUsers>>) {
  const questions = await prisma.networkingQuestion.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
  });
  const fixedQuestions = questions.filter(({ isCustom }) => !isCustom);
  const customQuestion = questions.find(({ isCustom }) => isCustom);

  if (fixedQuestions.length !== 3 || !customQuestion) {
    throw new Error("Katalog pertanyaan Networking belum dimigrasikan dengan benar.");
  }

  const submissions = [
    {
      userId: users.nala.id,
      friendId: users.bima.id,
      label: "Nala+Bima",
    },
    {
      userId: users.nala.id,
      friendId: users.arya.id,
      label: "Nala+Arya",
    },
    {
      userId: users.nala.id,
      friendId: users.kusuma.id,
      label: "Nala+Kusuma",
    },
    {
      userId: users.nala.id,
      friendId: users.metta.id,
      label: "Nala+Metta",
    },
    {
      userId: users.bima.id,
      friendId: users.nala.id,
      label: "Bima+Nala",
    },
  ];

  for (const submission of submissions) {
    const savedSubmission = await prisma.networkingSubmission.upsert({
      where: {
        userId_friendId: {
          userId: submission.userId,
          friendId: submission.friendId,
        },
      },
      update: { photoUrl: `${SEED_IMAGE}?text=${encodeURIComponent(submission.label)}` },
      create: {
        userId: submission.userId,
        friendId: submission.friendId,
        photoUrl: `${SEED_IMAGE}?text=${encodeURIComponent(submission.label)}`,
      },
    });

    await prisma.networkingAnswer.deleteMany({
      where: { submissionId: savedSubmission.id },
    });
    await prisma.networkingAnswer.createMany({
      data: [
        ...fixedQuestions.map((question) => ({
          submissionId: savedSubmission.id,
          questionId: question.id,
          answer: `Jawaban seed untuk: ${question.prompt}`,
        })),
        {
          submissionId: savedSubmission.id,
          questionId: customQuestion.id,
          customQuestion: "Apa kegiatan kampus yang paling ingin kamu ikuti?",
          answer: "Saya ingin aktif di kegiatan yang membantu saya berkembang dan mengenal teman baru.",
        },
      ],
    });
  }
}

async function seedTaskSubmissions(users: Awaited<ReturnType<typeof seedUsers>>) {
  const fossibSubmissions = [
    {
      userId: users.nala.id,
      fileUrl: "https://res.cloudinary.com/ppmb-kmbui/raw/upload/seed/fossib-nala.pdf",
      photoUrl: `${SEED_IMAGE}?text=Fossib+Nala`,
    },
    {
      userId: users.bima.id,
      fileUrl: "https://res.cloudinary.com/ppmb-kmbui/raw/upload/seed/fossib-bima.pdf",
      photoUrl: `${SEED_IMAGE}?text=Fossib+Bima`,
    },
  ];

  for (const submission of fossibSubmissions) {
    await prisma.fossibSubmission.upsert({
      where: { userId: submission.userId },
      update: {
        fileUrl: submission.fileUrl,
        photoUrl: submission.photoUrl,
      },
      create: submission,
    });
  }

  await prisma.insightHuntingSubmission.upsert({
    where: { userId: users.nala.id },
    update: {
      file_url: "https://res.cloudinary.com/ppmb-kmbui/raw/upload/seed/insight-hunting-nala.pdf",
    },
    create: {
      userId: users.nala.id,
      file_url: "https://res.cloudinary.com/ppmb-kmbui/raw/upload/seed/insight-hunting-nala.pdf",
    },
  });

  await prisma.explorerSubmission.upsert({
    where: { userId: users.nala.id },
    update: {
      activityName: "Puja Bakti dan Diskusi Dhamma",
      img_url: `${SEED_IMAGE}?text=Explorer`,
    },
    create: {
      userId: users.nala.id,
      activityName: "Puja Bakti dan Diskusi Dhamma",
      img_url: `${SEED_IMAGE}?text=Explorer`,
    },
  });

  await prisma.mentoringSubmission.upsert({
    where: { userId: users.nala.id },
    update: {
      gdriveUrl: "https://drive.google.com/drive/folders/seed-mentoring-nala",
    },
    create: {
      userId: users.nala.id,
      gdriveUrl: "https://drive.google.com/drive/folders/seed-mentoring-nala",
    },
  });
}

async function seedQuotes(users: Awaited<ReturnType<typeof seedUsers>>) {
  const quotes = [
    {
      userId: users.nala.id,
      quote: "Mulai pelan-pelan juga tetap mulai.",
    },
    {
      userId: users.bima.id,
      quote: "Teman baru, ritme baru, semangat baru.",
    },
    {
      userId: users.citra.id,
      quote: "Berani bertanya adalah skill bertahan hidup di kampus.",
    },
  ];

  for (const item of quotes) {
    const existing = await prisma.quotes.findFirst({
      where: { userId: item.userId, quote: item.quote },
    });

    if (!existing) {
      await prisma.quotes.create({ data: item });
    }
  }
}

async function seedContent() {
  const timeline = [
    {
      title: "Open Registration PPMB 2026",
      description: "Peserta mulai membuat akun dan melengkapi profil.",
      startsAt: new Date("2026-07-15T02:00:00.000Z"),
      location: "Online",
      meetingUrl: null,
      position: 1,
      isPublished: true,
    },
    {
      title: "Technical Meeting",
      description: "Briefing alur acara, tugas, dan aturan PPMB KMB UI.",
      startsAt: new Date("2026-08-01T12:00:00.000Z"),
      location: "Zoom Meeting",
      meetingUrl: "https://example.com/seed/tm",
      position: 2,
      isPublished: true,
    },
    {
      title: "Main Event PPMB",
      description: "Hari utama PPMB KMB UI 2026.",
      startsAt: new Date("2026-08-10T01:00:00.000Z"),
      location: "Universitas Indonesia",
      meetingUrl: null,
      position: 3,
      isPublished: true,
    },
  ];

  for (const item of timeline) {
    const existing = await prisma.timelineEvent.findFirst({
      where: { title: item.title },
    });

    if (existing) {
      await prisma.timelineEvent.update({
        where: { id: existing.id },
        data: item,
      });
    } else {
      await prisma.timelineEvent.create({ data: item });
    }
  }

  const faqs = [
    {
      question: "Siapa yang wajib mengikuti PPMB KMB UI 2026?",
      answer: "Mahasiswa baru Buddhis UI angkatan 2026 dianjurkan mengikuti rangkaian PPMB.",
      position: 1,
      isPublished: true,
    },
    {
      question: "Apakah tugas perlu dikumpulkan lewat website?",
      answer: "Ya, tugas dan bukti kegiatan dikumpulkan melalui akun masing-masing peserta.",
      position: 2,
      isPublished: true,
    },
    {
      question: "Kalau ada kendala login harus menghubungi siapa?",
      answer: "Hubungi panitia PPMB melalui Line atau WhatsApp resmi yang tersedia.",
      position: 3,
      isPublished: true,
    },
  ];

  for (const item of faqs) {
    const existing = await prisma.faq.findFirst({
      where: { question: item.question },
    });

    if (existing) {
      await prisma.faq.update({
        where: { id: existing.id },
        data: item,
      });
    } else {
      await prisma.faq.create({ data: item });
    }
  }

  const sponsors = [
    {
      name: "KMB UI",
      imgUrl: `${SEED_IMAGE}?text=KMB+UI`,
      websiteUrl: "https://kmbui.org",
      position: 1,
      isPublished: true,
    },
    {
      name: "PPMB Partner",
      imgUrl: `${SEED_IMAGE}?text=Partner`,
      websiteUrl: "https://example.com",
      position: 2,
      isPublished: true,
    },
  ];

  for (const item of sponsors) {
    const existing = await prisma.sponsor.findFirst({
      where: { name: item.name },
    });

    if (existing) {
      await prisma.sponsor.update({
        where: { id: existing.id },
        data: item,
      });
    } else {
      await prisma.sponsor.create({ data: item });
    }
  }
}

async function seedMaterials() {
  const introCategory = await upsertMaterialCategory("PPMB Basics", 1);
  const taskCategory = await upsertMaterialCategory("Panduan Tugas", 2);
  const committeeVideoCategory = await upsertMaterialCategory("Video Panitia", 3);

  const materials = [
    {
      categoryId: introCategory.id,
      title: "Kenalan dengan PPMB KMB UI",
      description: "Video pengantar tentang tujuan dan rangkaian PPMB.",
      videoUrl: "https://example.com/seed/video/intro-ppmb",
      thumbnailUrl: `${SEED_IMAGE}?text=Intro`,
      position: 1,
      isPublished: true,
    },
    {
      categoryId: introCategory.id,
      title: "Etika Networking Peserta",
      description: "Panduan singkat agar sesi networking nyaman dan bermakna.",
      videoUrl: "https://example.com/seed/video/networking",
      thumbnailUrl: `${SEED_IMAGE}?text=Networking`,
      position: 2,
      isPublished: true,
    },
    {
      categoryId: taskCategory.id,
      title: "Cara Submit Tugas di Website",
      description: "Langkah upload tugas, refleksi, dan bukti kegiatan.",
      videoUrl: "https://example.com/seed/video/submit-task",
      thumbnailUrl: `${SEED_IMAGE}?text=Submit`,
      position: 1,
      isPublished: true,
    },
    {
      categoryId: committeeVideoCategory.id,
      title: "Perkenalan Panitia PPMB 2026",
      description: "Kenalan dengan panitia yang mendampingi rangkaian PPMB.",
      videoUrl: "https://example.com/seed/video/panitia-perkenalan",
      thumbnailUrl: `${SEED_IMAGE}?text=Video+Panitia`,
      position: 1,
      isPublished: true,
    },
    {
      categoryId: committeeVideoCategory.id,
      title: "Pesan untuk Peserta PPMB 2026",
      description: "Pesan singkat dari panitia untuk seluruh peserta.",
      videoUrl: "https://example.com/seed/video/panitia-pesan",
      thumbnailUrl: `${SEED_IMAGE}?text=Pesan+Panitia`,
      position: 2,
      isPublished: true,
    },
  ];

  for (const item of materials) {
    const existing = await prisma.material.findFirst({
      where: { title: item.title },
    });

    if (existing) {
      await prisma.material.update({
        where: { id: existing.id },
        data: item,
      });
    } else {
      await prisma.material.create({ data: item });
    }
  }
}

async function upsertMaterialCategory(name: string, position: number) {
  const existing = await prisma.materialCategory.findFirst({
    where: { name },
  });

  if (existing) {
    return prisma.materialCategory.update({
      where: { id: existing.id },
      data: { name, position },
    });
  }

  return prisma.materialCategory.create({
    data: { name, position },
  });
}

export async function main() {
  await prisma.$connect();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  const users = await seedUsers(passwordHash);

  await seedConnections(users);
  await seedNetworkingSubmissions(users);
  await seedTaskSubmissions(users);
  await seedQuotes(users);
  await seedContent();
  await seedMaterials();

  console.log("Seed selesai.");
  console.log(`Akun admin: admin@ppmb-kmbui.test / ${SEED_PASSWORD}`);
  console.log(`Akun peserta: nala.wijaya@example.com / ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
