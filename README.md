# Backend PPMB KMB UI 2026

Backend API berbasis Next.js App Router, Prisma, PostgreSQL/Supabase, dan autentikasi JWT melalui cookie HttpOnly.

Kontrak submission tugas dan alur Cloudinary/Google Drive tersedia di [docs/TASK_SUBMISSIONS.md](docs/TASK_SUBMISSIONS.md).

## Menjalankan project

Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL`, `DIRECT_URL`, dan `JWT_SECRET`.

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Server development berjalan di [http://localhost:4000](http://localhost:4000), sedangkan dokumentasi Swagger tersedia di `/api-doc`.

## Verifikasi sebelum push

```bash
npm run db:validate
npm run build
```

`DATABASE_URL` dipakai aplikasi melalui Supabase transaction pooler. `DIRECT_URL` dipakai Prisma CLI untuk migration melalui session pooler.
