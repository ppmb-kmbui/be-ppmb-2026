# Kontrak Submission Tugas PPMB 2026

Dokumen ini adalah kontrak final antara frontend dan backend untuk pengumpulan tugas PPMB 2026. Backend menerima URL dalam JSON, bukan file mentah atau `multipart/form-data`.

## Autentikasi

Semua endpoint pada dokumen ini membutuhkan JWT yang valid melalui salah satu cara berikut:

- cookie HttpOnly `ppmb_access_token`; atau
- header `Authorization: Bearer <token>`.

Untuk request browser lintas origin yang memakai cookie, frontend harus mengirim `credentials: "include"`.

## Alur upload

Untuk foto dan PDF:

1. Frontend mengunggah file ke Cloudinary.
2. Frontend menerima URL HTTPS hasil upload.
3. Frontend mengirim URL tersebut ke backend dalam payload JSON.
4. Backend hanya memvalidasi dan menyimpan URL.

Frontend unsigned upload membutuhkan `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` dan `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`. Jangan pernah menaruh `CLOUDINARY_API_SECRET` di frontend.

Link Google Drive untuk Mentoring tidak diunggah ke backend. Peserta menempelkan link share, lalu frontend mengirim link tersebut sebagai JSON. Networking tidak lagi memakai link Google Docs.

## Deadline submission

Setiap endpoint mutasi submission (`POST` atau `PUT`) memeriksa waktu server sebelum memvalidasi payload atau menyimpan data. Endpoint `GET` tetap dapat digunakan setelah deadline.

Deadline dikonfigurasi melalui environment variable berikut:

- `TASK_DEADLINE_NETWORKING`
- `TASK_DEADLINE_INSIGHT_HUNTING`
- `TASK_DEADLINE_EXPLORER`
- `TASK_DEADLINE_MENTORING`
- `TASK_DEADLINE_FOSSIB`

Nilai wajib berbentuk ISO 8601 dengan zona waktu eksplisit, misalnya `2026-08-10T23:59:59+07:00` untuk WIB. Submission ditutup saat waktu server sama dengan atau melewati deadline dan backend mengembalikan HTTP `403`. Konfigurasi yang kosong atau tidak valid ditolak secara fail-closed dengan HTTP `503`, sehingga deployment tidak pernah menerima submission tanpa deadline yang jelas.

Deadline PPMB 2026:

| Tugas | Deadline WIB | Nilai environment |
|---|---|---|
| Insight Hunting | 14 Agustus 2026, 23:59:59 | `2026-08-14T23:59:59+07:00` |
| Networking | 31 Agustus 2026, 23:59:59 | `2026-08-31T23:59:59+07:00` |
| Mentoring | 31 Agustus 2026, 23:59:59 | `2026-08-31T23:59:59+07:00` |
| KMBUI Explorer | 7 September 2026, 23:59:59 | `2026-09-07T23:59:59+07:00` |
| FOSSIB (Foster Sibling) | 7 September 2026, 23:59:59 | `2026-09-07T23:59:59+07:00` |

## Networking

Endpoint:

- `GET /api/v1/tasks/networking`
- `GET /api/v1/tasks/networking/{friendId}`
- `PUT /api/v1/tasks/networking/{friendId}`

Networking hanya dapat diisi untuk teman yang sudah saling terhubung. Backend memverifikasi dua row koneksi arah pengguna→teman dan teman→pengguna dengan status `accepted` (atau status legacy `done`). Target harus peserta non-admin dari angkatan 2023, 2024, 2025, atau 2026. Submission A→B dan B→A berdiri sendiri.

`GET /api/v1/tasks/networking` mengembalikan:

- katalog tiga pertanyaan tetap dan satu pertanyaan bebas;
- daftar teman eligible beserta status selesai;
- seluruh submission pengguna; dan
- progress total serta progress per angkatan.

Payload canonical `PUT`:

```json
{
  "photo_url": "https://res.cloudinary.com/.../networking.jpg",
  "answers": [
    { "question_id": 1, "answer": "..." },
    { "question_id": 2, "answer": "..." },
    { "question_id": 3, "answer": "..." }
  ],
  "custom_question": "Pertanyaan buatan peserta",
  "custom_answer": "Jawaban teman"
}
```

Semua field wajib terisi. `photo_url` harus berupa URL gambar HTTPS. Array `answers` harus berisi tepat tiga ID pertanyaan tetap yang sedang aktif tanpa duplikasi; pertanyaan bebas disimpan sebagai jawaban keempat yang ternormalisasi. `PUT` membuat submission baru atau mengganti seluruh jawaban submission yang sudah ada secara atomik, selama deadline belum lewat.

Progress Networking:

- angkatan 2026: 10 teman;
- angkatan 2025: 4 teman;
- angkatan 2024: 2 teman;
- angkatan 2023: 2 teman;
- total: `required: 18`.

Submission baru dihitung selesai jika foto, tiga jawaban tetap, pertanyaan bebas, dan jawaban bebas lengkap. Pengguna boleh mewawancarai lebih banyak teman, tetapi progress setiap angkatan dibatasi pada kuotanya. Tabel dua Google Docs sebelumnya hanya berisi dummy data dan diganti oleh tabel pertanyaan/submission/jawaban baru; tabel lain tidak disentuh.

## KMBUI Explorer

Endpoint:

- `GET /api/v1/tasks/explorer`
- `POST /api/v1/tasks/explorer`

Payload canonical:

```json
{
  "activity_name": "Puja Rutin",
  "photo_url": "https://res.cloudinary.com/.../explorer.jpg"
}
```

Nama aktivitas dan URL foto wajib ada agar tugas dihitung selesai.

## Mentoring

Endpoint:

- `GET /api/v1/tasks/mentoring`
- `POST /api/v1/tasks/mentoring`

Payload canonical:

```json
{
  "gdrive_url": "https://drive.google.com/drive/folders/..."
}
```

Mentoring hanya memiliki satu submission berupa link Google Drive. Satu link valid membuat progress Mentoring selesai.

Data `MentoringVlogSubmission` dan `MentoringReflection` lama tetap disimpan untuk kebutuhan historis dan tidak pernah ditimpa. Submission Google Drive baru disimpan terpisah di `mentoring_submissions`; migration hanya menyalin vlog legacy yang memang sudah berupa link resource Google Drive yang valid.

## FOSSIB

Endpoint:

- `GET /api/v1/tasks/fossib`
- `POST /api/v1/tasks/fossib`

Payload canonical:

```json
{
  "file_url": "https://res.cloudinary.com/.../fossib.pdf",
  "photo_url": "https://res.cloudinary.com/.../fossib.jpg"
}
```

FOSSIB hanya memiliki satu submission untuk seluruh tugas. URL PDF harus berakhiran `.pdf`, URL foto harus berupa delivery URL gambar HTTPS (termasuk Cloudinary `image/upload`), dan keduanya harus menunjuk dua file berbeda. Tugas baru dihitung selesai jika seluruh syarat terpenuhi.

Data FOSSIB sesi pertama dan kedua yang lama tetap disimpan untuk kebutuhan historis. Migration hanya menyalin row legacy yang sudah memenuhi kontrak PDF+foto ke submission canonical; row lain tetap utuh dan tidak dihitung.

## Insight Hunting

Endpoint:

- `GET /api/v1/tasks/insight-hunting`
- `POST /api/v1/tasks/insight-hunting`

Payload canonical:

```json
{
  "file_url": "https://res.cloudinary.com/.../insight-hunting.pdf"
}
```

Insight Hunting hanya membutuhkan satu URL PDF HTTPS yang berakhiran `.pdf`. Data lama yang masih berupa Google Docs tetap tersimpan, tetapi tidak dihitung selesai sampai peserta menggantinya dengan PDF.

Backend memvalidasi bentuk URL, bukan isi byte file. Tipe file sebenarnya harus tetap dibatasi oleh Cloudinary upload preset dan validasi frontend.

## Ringkasan progress dan kompatibilitas

`GET /api/v1/tasks` adalah endpoint ringkasan seluruh progress. Field `cards` merupakan sumber progress canonical:

| Card | Completed | Required |
|---|---:|---:|
| Networking | 0-18 | 18 |
| KMBUI Explorer | 0-1 | 1 |
| Mentoring | 0-1 | 1 |
| FOSSIB | 0-1 | 1 |
| Insight Hunting | 0-1 | 1 |

Endpoint tersebut masih mengembalikan beberapa field compatibility yang dibaca frontend saat ini, seperti `networkingAngkatan`, `networkingKating`, `firstFossibDone`, `secondFossibDone`, dan `mentoringReflectionDone`. Field Networking compatibility sekarang mengikuti quota 10/4/2/2; gunakan `cards` dan endpoint canonical di atas untuk integrasi baru.
