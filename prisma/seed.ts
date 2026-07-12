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

async function resetSequence(tableName: string, sequenceName: string) {
  await prisma.$executeRawUnsafe(
    `SELECT setval('${sequenceName}', (SELECT COALESCE(MAX(id), 1) FROM "${tableName}"));`,
  );
}

async function seedUsers(passwordHash: string) {
  const admin = await prisma.user.upsert({
    where: { email: "admin@ppmb-kmbui.test" },
    update: {
      fullname: "Admin PPMB 2026",
      imgUrl: `${SEED_IMAGE}?text=Admin`,
      password: passwordHash,
      faculty: "Panitia",
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
      faculty: "Panitia",
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
      faculty: "Fakultas Ilmu Komputer",
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
      faculty: "Fakultas Ilmu Komputer",
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
      faculty: "Fakultas Ekonomi dan Bisnis",
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
      faculty: "Fakultas Ekonomi dan Bisnis",
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
      faculty: "Fakultas Psikologi",
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
      faculty: "Fakultas Psikologi",
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
      faculty: "Fakultas Teknik",
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
      faculty: "Fakultas Teknik",
      isAdmin: false,
      batch: 2026,
      lineId: "darrentan",
      whatsappNumber: "6281244444444",
    },
  });

  return { admin, nala, bima, citra, darren };
}

async function ensureSeniorUser(fullname: string, batch: number) {
  const existing = await prisma.seniorUser.findFirst({
    where: { fullname, batch },
  });

  if (existing) return existing;

  return prisma.seniorUser.create({
    data: { fullname, batch },
  });
}

async function seedQuestions() {
  const questions = [
    {
      id: 1,
      question: "Jalur masuk UI serta alasan mengambil jurusan tersebut",
      group_id: 1,
    },
    {
      id: 2,
      question:
        "Suasana hati setelah dinyatakan diterima di UI beserta impian/persiapan akademik kedepannya",
      group_id: 1,
    },
    {
      id: 3,
      question:
        "Kegiatan apa yang ingin kamu coba selama kuliah untuk menemukan minat dan tujuan baru",
      group_id: 2,
    },
    {
      id: 4,
      question: "Apa satu kebiasaan kecil yang ingin kamu tingkatkan selama kuliah?",
      group_id: 2,
    },
    {
      id: 5,
      question:
        "Kalau kamu bisa punya superpower, apa yang kamu pilih dan bagaimana kamu akan menggunakannya untuk membantu orang lain",
      group_id: 2,
    },
    {
      id: 6,
      question: "Apa cita-cita atau impianmu, dan kenapa memilih itu",
      group_id: 2,
    },
    {
      id: 7,
      question: "Pengalaman yang paling seru dan mengesankan selama SMA",
      group_id: 2,
    },
    {
      id: 8,
      question: "Kalau ada pintu doraemon kemana saja, kamu mau pergi kemana dan kenapa",
      group_id: 2,
    },
    {
      id: 9,
      question: "Area atau tempat di UI mana yang pernah kamu datangi atau ingin datangi",
      group_id: 2,
    },
    {
      id: 10,
      question: "Kalau kamu bisa jadi karakter di film atau buku, kamu mau jadi siapa dan alasannya apa",
      group_id: 2,
    },
    {
      id: 11,
      question: "Siapa role model-mu dan apa hal yang paling kamu suka dari dia",
      group_id: 2,
    },
    {
      id: 12,
      question: "Musik yang paling membantu dirimu untuk moodbooster",
      group_id: 2,
    },
    {
      id: 13,
      question: "Makanan dan minuman yang paling tidak kamu suka dan alasannya",
      group_id: 2,
    },
  ];

  for (const item of questions) {
    await prisma.question.upsert({
      where: { id: item.id },
      update: {
        question: item.question,
        group_id: item.group_id,
      },
      create: item,
    });
  }

  const katingQuestions = [
    {
      id: 1,
      question: "Kiat untuk mengatur waktu dalam perkuliahan dan motivasi untuk tetap semangat kuliah",
      group_id: 1,
    },
    {
      id: 2,
      question: "Kesan pertama berkuliah di UI",
      group_id: 1,
    },
    {
      id: 3,
      question: "Tips and trick belajar dan rekomendasi organisasi dan UKM di UI",
      group_id: 1,
    },
    {
      id: 4,
      question: "Rekomendasi makanan di UI",
      group_id: 1,
    },
    {
      id: 5,
      question: "Apa pendapat Ko/Ci tentang KMBUI dan pengalaman di KMBUI",
      group_id: 1,
    },
    {
      id: 6,
      question: "Tempat nongkrong atau belajar di dalam UI dan sekitar UI",
      group_id: 1,
    },
    {
      id: 7,
      question: "Hobi dan kegiatan saat luang di UI",
      group_id: 1,
    },
  ];

  for (const item of katingQuestions) {
    await prisma.questionKating.upsert({
      where: { id: item.id },
      update: {
        question: item.question,
        group_id: item.group_id,
      },
      create: item,
    });
  }

  await resetSequence("questions", "questions_id_seq");
  await resetSequence("questions_kating", "questions_kating_id_seq");
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
  await ensureConnectionRequest(users.citra.id, users.nala.id);
}

async function seedNetworking(users: Awaited<ReturnType<typeof seedUsers>>, seniors: { adrian: { id: number }; michelle: { id: number } }) {
  await prisma.networkingTask.upsert({
    where: {
      fromId_toId: {
        fromId: users.nala.id,
        toId: users.bima.id,
      },
    },
    update: {
      img_url: `${SEED_IMAGE}?text=Nala+Bima`,
      file_url: "https://example.com/seed/networking/nala-bima.pdf",
      description: "Networking maba dengan Bima setelah sesi PPMB.",
      is_done: true,
    },
    create: {
      fromId: users.nala.id,
      toId: users.bima.id,
      img_url: `${SEED_IMAGE}?text=Nala+Bima`,
      file_url: "https://example.com/seed/networking/nala-bima.pdf",
      description: "Networking maba dengan Bima setelah sesi PPMB.",
      is_done: true,
    },
  });

  await prisma.networkingTask.upsert({
    where: {
      fromId_toId: {
        fromId: users.bima.id,
        toId: users.nala.id,
      },
    },
    update: {
      img_url: `${SEED_IMAGE}?text=Bima+Nala`,
      file_url: "https://example.com/seed/networking/bima-nala.pdf",
      description: "Networking balasan dari Bima ke Nala.",
      is_done: true,
    },
    create: {
      fromId: users.bima.id,
      toId: users.nala.id,
      img_url: `${SEED_IMAGE}?text=Bima+Nala`,
      file_url: "https://example.com/seed/networking/bima-nala.pdf",
      description: "Networking balasan dari Bima ke Nala.",
      is_done: true,
    },
  });

  await prisma.networkingTask.upsert({
    where: {
      fromId_toId: {
        fromId: users.citra.id,
        toId: users.darren.id,
      },
    },
    update: {
      img_url: null,
      file_url: null,
      description: null,
      is_done: false,
    },
    create: {
      fromId: users.citra.id,
      toId: users.darren.id,
      is_done: false,
    },
  });

  const mabaAnswers = [
    {
      fromId: users.nala.id,
      toId: users.bima.id,
      answers: [
        { questionId: 1, answer: "Aku masuk lewat SNBT dan memilih Fasilkom karena suka problem solving." },
        { questionId: 4, answer: "Aku ingin lebih konsisten mencatat dan review materi tiap minggu." },
        { questionId: 6, answer: "Aku ingin membangun produk teknologi yang bermanfaat untuk pendidikan." },
        { questionId: 13, answer: "Aku kurang suka pare karena pahit, tapi tetap menghargai fans pare." },
      ],
    },
    {
      fromId: users.bima.id,
      toId: users.nala.id,
      answers: [
        { questionId: 2, answer: "Rasanya campur aduk: lega, senang, dan sedikit deg-degan." },
        { questionId: 7, answer: "Pengalaman paling seru saat jadi panitia pensi sekolah." },
        { questionId: 11, answer: "Role model-ku orang tua karena konsisten dan sabar." },
      ],
    },
    {
      fromId: users.citra.id,
      toId: users.darren.id,
      answers: [
        { questionId: 3, answer: null },
        { questionId: 5, answer: null },
        { questionId: 9, answer: null },
      ],
    },
  ];

  for (const task of mabaAnswers) {
    for (const item of task.answers) {
      await prisma.questionTask.upsert({
        where: {
          questionId_fromId_toId: {
            questionId: item.questionId,
            fromId: task.fromId,
            toId: task.toId,
          },
        },
        update: { answer: item.answer },
        create: {
          questionId: item.questionId,
          fromId: task.fromId,
          toId: task.toId,
          answer: item.answer,
        },
      });
    }
  }

  await prisma.networkingKatingTask.upsert({
    where: {
      fromId_toId: {
        fromId: users.nala.id,
        toId: seniors.adrian.id,
      },
    },
    update: {
      img_url: `${SEED_IMAGE}?text=Nala+Adrian`,
      file_url: "https://example.com/seed/networking/nala-adrian.pdf",
      description: "Networking dengan Ko Adrian tentang adaptasi kuliah.",
    },
    create: {
      fromId: users.nala.id,
      toId: seniors.adrian.id,
      img_url: `${SEED_IMAGE}?text=Nala+Adrian`,
      file_url: "https://example.com/seed/networking/nala-adrian.pdf",
      description: "Networking dengan Ko Adrian tentang adaptasi kuliah.",
    },
  });

  await prisma.networkingKatingTask.upsert({
    where: {
      fromId_toId: {
        fromId: users.bima.id,
        toId: seniors.michelle.id,
      },
    },
    update: {
      img_url: `${SEED_IMAGE}?text=Bima+Michelle`,
      file_url: "https://example.com/seed/networking/bima-michelle.pdf",
      description: "Networking dengan Ci Michelle tentang organisasi dan akademik.",
    },
    create: {
      fromId: users.bima.id,
      toId: seniors.michelle.id,
      img_url: `${SEED_IMAGE}?text=Bima+Michelle`,
      file_url: "https://example.com/seed/networking/bima-michelle.pdf",
      description: "Networking dengan Ci Michelle tentang organisasi dan akademik.",
    },
  });

  const katingAnswers = [
    {
      fromId: users.nala.id,
      toId: seniors.adrian.id,
      answers: [
        "Pakai kalender mingguan dan jangan menumpuk tugas.",
        "Awalnya ramai dan menantang, tapi cepat terasa menyenangkan.",
        "Coba UKM sesuai minat dulu, jangan takut eksplor.",
        "Kantin Teknik dan sekitar Stasiun UI banyak opsi.",
        "KMBUI terasa hangat karena banyak teman lintas fakultas.",
        "Perpus UI nyaman untuk fokus belajar.",
        "Biasanya olahraga ringan atau ngopi bersama teman.",
      ],
    },
    {
      fromId: users.bima.id,
      toId: seniors.michelle.id,
      answers: [
        "Bikin prioritas, tidur cukup, dan belajar dari jauh hari.",
        "Seru karena banyak kesempatan baru.",
        "Ikut organisasi secukupnya, kualitas lebih penting dari jumlah.",
        "Cobain makanan di kantin FEB.",
        "KMBUI membantu aku punya support system.",
        "Perpus pusat dan taman dekat danau enak untuk diskusi.",
        "Aku suka baca dan jalan sore di kampus.",
      ],
    },
  ];

  for (const task of katingAnswers) {
    for (const [index, answer] of task.answers.entries()) {
      const questionId = index + 1;
      await prisma.questionKatingTask.upsert({
        where: {
          questionId_fromId_toId: {
            questionId,
            fromId: task.fromId,
            toId: task.toId,
          },
        },
        update: { answer },
        create: {
          questionId,
          fromId: task.fromId,
          toId: task.toId,
          answer,
        },
      });
    }
  }
}

async function seedTaskSubmissions(users: Awaited<ReturnType<typeof seedUsers>>) {
  await prisma.firstFossibSessionSubmission.upsert({
    where: { userId: users.nala.id },
    update: {
      file_url: "https://docs.google.com/document/d/seed-fossib-1-nala/edit",
      photo_url: `${SEED_IMAGE}?text=Fossib+1`,
      description: "Catatan refleksi Fossib sesi pertama.",
    },
    create: {
      userId: users.nala.id,
      file_url: "https://docs.google.com/document/d/seed-fossib-1-nala/edit",
      photo_url: `${SEED_IMAGE}?text=Fossib+1`,
      description: "Catatan refleksi Fossib sesi pertama.",
    },
  });

  await prisma.secondFossibSessionSubmission.upsert({
    where: { userId: users.nala.id },
    update: {
      file_url: "https://docs.google.com/document/d/seed-fossib-2-nala/edit",
      photo_url: `${SEED_IMAGE}?text=Fossib+2`,
      description: "Catatan refleksi Fossib sesi kedua.",
    },
    create: {
      userId: users.nala.id,
      file_url: "https://docs.google.com/document/d/seed-fossib-2-nala/edit",
      photo_url: `${SEED_IMAGE}?text=Fossib+2`,
      description: "Catatan refleksi Fossib sesi kedua.",
    },
  });

  await prisma.insightHuntingSubmission.upsert({
    where: { userId: users.nala.id },
    update: {
      file_url: "https://docs.google.com/document/d/seed-insight-hunting-nala/edit",
    },
    create: {
      userId: users.nala.id,
      file_url: "https://docs.google.com/document/d/seed-insight-hunting-nala/edit",
    },
  });

  await prisma.explorerSubmission.upsert({
    where: { userId: users.nala.id },
    update: {
      img_url: `${SEED_IMAGE}?text=Explorer`,
    },
    create: {
      userId: users.nala.id,
      img_url: `${SEED_IMAGE}?text=Explorer`,
    },
  });

  await prisma.mentoringVlogSubmission.upsert({
    where: { userId: users.nala.id },
    update: {
      file_url: "https://drive.google.com/drive/folders/seed-mentoring-nala",
      description: "Folder Google Drive berisi video dan TTS mentoring.",
    },
    create: {
      userId: users.nala.id,
      file_url: "https://drive.google.com/drive/folders/seed-mentoring-nala",
      description: "Folder Google Drive berisi video dan TTS mentoring.",
    },
  });

  await prisma.firstFossibSessionSubmission.upsert({
    where: { userId: users.bima.id },
    update: {
      file_url: null,
      description: "Bima mengisi refleksi teks tanpa lampiran.",
    },
    create: {
      userId: users.bima.id,
      description: "Bima mengisi refleksi teks tanpa lampiran.",
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
  const seniors = {
    adrian: await ensureSeniorUser("Ko Adrian Santoso", 2024),
    michelle: await ensureSeniorUser("Ci Michelle Tan", 2023),
  };

  await seedQuestions();
  await seedConnections(users);
  await seedNetworking(users, seniors);
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
