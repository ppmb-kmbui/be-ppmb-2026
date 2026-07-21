# Backend PPMB KMB UI 2026

Backend API berbasis Next.js App Router, Prisma, PostgreSQL/Supabase, dan autentikasi JWT melalui cookie HttpOnly.

Registrasi publik hanya menerima peserta angkatan 2026. Akun kakak tingkat angkatan 2023-2025 dibuat melalui seed terkontrol dan tidak dapat didaftarkan melalui endpoint publik.

Semua route tugas hanya dapat diakses peserta non-admin angkatan 2026. Autentikasi route memverifikasi JWT lalu mengambil kembali user dan role terkini dari database, sehingga token user yang sudah dihapus serta claim admin yang sudah tidak berlaku akan ditolak.

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

`db:check-integrity` bersifat read-only dan wajib dijalankan sebelum migration yang menambahkan constraint koneksi. Tooling dan sumber seed produksi bersifat lokal, tidak dilacak Git, dan tidak menjadi bagian dari workflow aplikasi.

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
- `GET /api/v1/profile/{id}` mengembalikan profil publik peserta lain.
- `GET /api/v1/friends?scope=discover` menyediakan kandidat Kalyanamitta yang sudah disaring sebelum pagination; filter `batch` dapat digunakan untuk memilih angkatan.
