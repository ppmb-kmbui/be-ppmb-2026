import { getPrisma } from '../src/lib/prisma'
const prisma = getPrisma()

export async function main() {
    await prisma.$connect();
    await prisma.question.createMany({
        data: [
            {
                id: 1,
                question: "Jalur masuk UI serta alasan mengambil jurusan tersebut",
                group_id: 1
            },
            {
                id: 2,
                question: "Suasana hati setelah dinyatakan diterima di UI beserta impian/persiapan akademik kedepannya",
                group_id: 1
            },
        ],
        skipDuplicates: true,
    });

    await prisma.question.createMany({
        data: [
            {
                id: 3,
                question: "Kegiatan apa yang ingin kamu coba selama kuliah untuk menemukan minat dan tujuan baru",
                group_id: 2
            },
            {
                id: 4,
                question: "Apa satu kebiasaan kecil yang ingin kamu tingkatkan selama kuliah?",
                group_id: 2
            },
            {
                id: 5,
                question: "Kalau kamu bisa punya superpower, apa yang kamu pilih dan bagaimana kamu akan menggunakannya untuk membantu orang lain",
                group_id: 2
            },
            {
                id: 6,
                question: "Apa cita-cita atau impianmu, dan kenapa memilih itu",
                group_id: 2
            },
            {
                id: 7,
                question: "Pengalaman yang paling seru dan mengesankan selama SMA",
                group_id: 2
            },
            {
                id: 8,
                question: "Kalau ada pintu doraemon kemana saja, kamu mau pergi kemana dan kenapa",
                group_id: 2
            },
            {
                id: 9,
                question: "Area atau tempat  di UI mana yang pernah kamu didatangi atau ingin didatangi",
                group_id: 2
            },
            {
                id: 10,
                question: "Kalau kamu bisa jadi karakter di film atau buku, kamu mau jadi siapa dan alasannya apa",
                group_id: 2
            },
            {
                id: 11,
                question: "Siapa role model-mu dan apa hal yang paling kalian suka dari dia",
                group_id: 2
            },
            {
                id: 12,
                question: "Musik yang paling membantu dirimu untuk moodbooster",
                group_id: 2
            },
            {
                id: 13,
                question: "Makanan dan minuman yang paling tidak kamu suka dan alasannya",
                group_id: 2
            },
        ],
        skipDuplicates: true,
    });

    await prisma.questionKating.createMany({
        data: [
            {
                id: 1,
                question: "Kiat untuk mengatur waktu dalam perkuliahan dan motivasi untuk tetap semangat kuliah",
                group_id: 1
            },
            {
                id: 2,
                question: "Kesan pertama berkuliah di UI",
                group_id: 1
            },
            {
                id: 3,
                question: "Tips and trick belajar dan rekomendasi organisasi dan UKM di UI",
                group_id: 1
            },
            {
                id: 4,
                question: "Rekomendasi makanan di UI",
                group_id: 1
            },
            {
                id: 5,
                question: "Apa pendapat Ko/Ci tentang KMBUI, pengalaman di KMBUI",
                group_id: 1
            },
            {
                id: 6,
                question: "Tempat nongkrong / belajar di dalam UI dan sekitar UI",
                group_id: 1
            },
            {
                id: 7,
                question: "Hobi dan kegiatan saat luang di UI",
                group_id: 1
            }
        ], skipDuplicates: true
    })
    await prisma.$executeRaw`
        SELECT setval('questions_kating_id_seq', (SELECT MAX(id) FROM questions_kating));
    `;
    await prisma.$executeRaw`
        SELECT setval('questions_id_seq', (SELECT MAX(id) FROM questions));
    `;
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
