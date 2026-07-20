# Backend PPMB KMB UI 2026

Backend API berbasis Next.js App Router, Prisma, PostgreSQL/Supabase, dan autentikasi JWT melalui cookie HttpOnly.

Kontrak submission tugas dan alur Cloudinary/Google Drive tersedia di [docs/TASK_SUBMISSIONS.md](docs/TASK_SUBMISSIONS.md).

## Menjalankan project

Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL`, `DIRECT_URL`, dan `JWT_SECRET`.

```bash
npm install
npm run db:generate
npm run db:check-integrity
npm run db:migrate
npm run dev
```

`db:check-integrity` bersifat read-only dan wajib dijalankan sebelum migration yang menambahkan constraint koneksi. Jalankan `npm run db:seed` hanya pada database development/test; seed tidak diperlukan dan tidak aman untuk database production yang sudah berisi data peserta.

Server development berjalan di [http://localhost:4000](http://localhost:4000), sedangkan dokumentasi Swagger tersedia di `/api-doc`.

## Verifikasi sebelum push

```bash
npm run db:validate
npm run test:task-contracts
npm run test:networking
npm run test:auth-routes
npm run build
```

`DATABASE_URL` dipakai aplikasi melalui Supabase transaction pooler. `DIRECT_URL` dipakai Prisma CLI untuk migration melalui session pooler.

## Endpoint profil

- `GET /api/v1/auth/profile` mengembalikan identitas sesi yang dipakai header/frontend.
- `GET /api/v1/profile` mengembalikan profil lengkap beserta jumlah followers.
- `PUT /api/v1/profile` memperbarui profil peserta.
