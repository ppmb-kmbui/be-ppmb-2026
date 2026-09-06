# Kontrak Submission Tugas PPMB 2026

Dokumen ini adalah kontrak final antara frontend dan backend untuk pengumpulan tugas PPMB 2026. Endpoint tugas pada umumnya menerima URL dalam JSON. Insight Hunting juga memiliki endpoint multipart khusus agar PDF dapat diunggah ke Cloudinary melalui backend tanpa mengekspos secret ke browser.

## Autentikasi

Semua endpoint pada dokumen ini membutuhkan JWT yang valid melalui salah satu cara berikut:

- cookie HttpOnly `ppmb_access_token`; atau
- header `Authorization: Bearer <token>`.

Untuk request browser lintas origin yang memakai cookie, frontend harus mengirim `credentials: "include"`.

Setelah JWT diverifikasi, backend selalu memuat ulang user dan status admin terkini dari database. Token milik user yang sudah dihapus ditolak, dan claim role lama di JWT tidak dapat memberikan akses admin. Seluruh endpoint `/api/v1/tasks/**` pada dokumen ini hanya tersedia untuk peserta non-admin angkatan 2026; akun angkatan 2023-2025 hanya dapat melihat profil dan akan menerima HTTP `403` dengan kode `TASKS_FOR_2026_ONLY` jika mencoba membuka atau mengirim tugas.

## Alur upload

Untuk foto dan endpoint PDF berbasis URL:

1. Frontend mengunggah file ke Cloudinary.
2. Frontend menerima URL HTTPS hasil upload.
3. Frontend mengirim URL tersebut ke backend dalam payload JSON.
4. Backend hanya memvalidasi dan menyimpan URL.

Alur kompatibilitas frontend unsigned upload membutuhkan `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` dan `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`. Jangan pernah menaruh `CLOUDINARY_API_SECRET` di frontend.

Untuk Insight Hunting, integrasi baru sebaiknya mengirim file ke `POST /api/v1/tasks/insight-hunting/upload`. Backend memvalidasi file lalu melakukan signed upload dengan `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, dan `CLOUDINARY_API_SECRET` yang hanya tersimpan di environment backend. Endpoint ini tidak memakai unsigned upload preset.

Link Google Drive untuk Mentoring tidak diunggah ke backend. Peserta menempelkan link share, lalu frontend mengirim link tersebut sebagai JSON. Networking tidak lagi memakai link Google Docs.

## Pengumpulan terbuka dan status Telat

Seluruh tugas menerima pengumpulan maupun pengumpulan ulang tanpa penutupan berdasarkan waktu. Environment `TASK_DEADLINE_*` lama tidak lagi dibaca, termasuk jika kosong, invalid, atau sudah lewat. Autentikasi, akses peserta 2026, dan validasi isi/file tetap berlaku.

Untuk kelima tugas, **Telat** berarti pengumpulan terakhir berhasil tersimpan pada atau setelah **6 September 2026 pukul 00.00 WIB**, yaitu `2026-09-05T17:00:00.000Z`. Seluruh tanggal 5 September WIB masih tepat waktu. Mengedit/mengumpulkan ulang setelah batas tersebut menjadikan tugas Telat walaupun pengumpulan pertama tepat waktu. Waktu berasal dari server; payload peserta tidak dapat menentukan timestamp atau label.

`GET /api/v1/admin/tasks/{id}` menyediakan `submissionTiming` untuk `networking`, `explorer`, `mentoring`, `fossib`, dan `insight-hunting`. Masing-masing berisi `{ submittedAt: string | null, isLate: boolean | null }`. `submittedAt` adalah timestamp ISO UTC pengumpulan terakhir. Networking memakai waktu terbaru dari seluruh wawancara yang tersimpan, termasuk submission parsial dan target yang kemudian hidden. Review admin tidak mengubah waktu pengumpulan.

`GET /api/v1/admin/users` menyediakan map yang sama dan `lateTaskCount` (0–5) untuk badge daftar peserta. Label Telat di detail tugas berdiri terpisah dari kelengkapan dan penilaian; tugas yang lengkap tetap dapat dinilai walaupun telat.

Networking, FOSSIB, dan Mentoring memakai `updatedAt` submission. Explorer dan Insight Hunting menggunakan kolom nullable `submitted_at` dari migration `20260906000000_track_submission_times`. Migration ini perlu diterapkan sebelum menjalankan backend baru. Kedua model terakhir tidak memiliki timestamp historis; row lama tetap NULL hingga dikumpulkan ulang, sehingga `isLate: null` berarti waktu tidak diketahui. Migration tidak memberikan tanggal buatan pada submission lama.

## Networking

Endpoint:

- `GET /api/v1/tasks/networking`
- `GET /api/v1/tasks/networking/{friendId}`
- `PUT /api/v1/tasks/networking/{friendId}`

Networking hanya dapat diisi oleh peserta angkatan 2026. Untuk target sesama angkatan 2026, backend memverifikasi dua row koneksi arah pengguna→teman dan teman→pengguna dengan status `accepted` (atau status legacy `done`). Target kakak tingkat angkatan 2023, 2024, atau 2025 dapat langsung diajak Networking tanpa pertemanan.

`GET /api/v1/tasks/networking` mengembalikan:

- dua katalog pertanyaan: `peer` untuk sesama 2026 dan `senior` untuk kakak tingkat;
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

Semua field wajib terisi. `photo_url` harus berupa URL gambar HTTPS. Untuk target 2026, `answers` harus berisi tiga ID pertanyaan tetap katalog `peer`. Untuk target 2023-2025, `answers` harus berisi lima ID pertanyaan tetap katalog `senior`. Pertanyaan bebas dan jawabannya wajib untuk kedua katalog. `PUT` membuat submission baru atau mengganti seluruh jawaban secara atomik dan memperbarui waktu pengumpulan terakhir.

Katalog `senior` mengikuti template kakak tingkat:

1. hal yang ingin dilakukan berbeda apabila kembali menjadi mahasiswa baru;
2. saran untuk memaksimalkan pengalaman selama berkuliah di UI;
3. pandangan mengenai UI serta tips untuk bertahan di UI;
4. pandangan dan pengalaman di KMBUI; dan
5. pengalaman keluar dari zona nyaman serta cara mengatasinya.

Pertanyaan keenam pada katalog `senior` adalah pertanyaan bebas dari mahasiswa baru.

Progress Networking:

- angkatan 2026: 10 teman;
- angkatan 2025: 4 teman;
- angkatan 2024: 2 teman;
- angkatan 2023: 2 teman;
- total: `required: 18`.

Submission baru dihitung selesai jika foto, seluruh jawaban tetap sesuai jenis target, pertanyaan bebas, dan jawaban bebas lengkap. Pengguna boleh mewawancarai lebih banyak orang, tetapi progress setiap angkatan dibatasi pada kuotanya. Pengguna selain angkatan 2026 tidak memiliki progress atau akses submission Networking.

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
- `POST /api/v1/tasks/insight-hunting/upload`

Payload canonical:

```json
{
  "file_url": "https://res.cloudinary.com/.../insight-hunting.pdf"
}
```

Insight Hunting hanya membutuhkan satu URL PDF HTTPS yang berakhiran `.pdf`. Data lama yang masih berupa Google Docs tetap tersimpan, tetapi tidak dihitung selesai sampai peserta menggantinya dengan PDF.

`POST /api/v1/tasks/insight-hunting` tetap menerima payload JSON di atas untuk kompatibilitas. Endpoint tersebut memvalidasi bentuk URL, bukan isi byte file.

Endpoint multipart baru menerima tepat satu file pada field `file`. Request harus menggunakan `multipart/form-data`; jangan menetapkan header `Content-Type` secara manual di browser karena boundary dibuat otomatis. Backend menerima MIME `application/pdf`; untuk kompatibilitas document provider mobile, MIME kosong atau `application/octet-stream` hanya diterima jika nama file berakhiran `.pdf`. Semua jalur tetap mewajibkan magic bytes `%PDF-` dan ukuran maksimal **4 MiB** sebelum signed upload ke resource type `raw` di Cloudinary. Setiap peserta memakai `public_id` deterministik dan `overwrite=true`, sehingga percobaan ulang atau pengumpulan ulang mengganti asset yang sama alih-alih meninggalkan file yatim. Endpoint kemudian melakukan upsert pada submission yang sama dan mengembalikan response sukses yang sama dengan endpoint JSON.

Batas proxy 4 MiB sengaja lebih kecil daripada batas dokumen umum 10 MiB. Deployment menggunakan Vercel Functions yang memiliki batas request body 4,5 MB; sisa ruang diperlukan untuk multipart boundary dan metadata. PDF lebih besar harus dikompresi sebelum memakai endpoint ini. Request yang melewati batas dikembalikan sebagai HTTP `413` dengan kode `PDF_FILE_TOO_LARGE`.

Kesalahan file menggunakan HTTP `400`, `413`, atau `415`. Kegagalan Cloudinary yang aman untuk dicoba ulang menggunakan HTTP `502`, sedangkan kredensial server yang belum lengkap menggunakan HTTP `503` dengan kode `CLOUDINARY_NOT_CONFIGURED`. Response tidak pernah memuat API secret, signature, ataupun detail mentah dari Cloudinary.

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

## Penilaian admin

Admin dapat melihat submission dan review peserta melalui:

- `GET /api/v1/admin/tasks/{participantId}`
- `PUT /api/v1/admin/tasks/{participantId}/reviews/{taskType}`

Nilai `taskType` yang didukung adalah `networking`, `explorer`, `mentoring`, `fossib`, dan `insight-hunting`. Networking dinilai satu kali untuk keseluruhan 18 wawancara. Request penilaian:

```json
{
  "score": 90,
  "feedback": "Pekerjaan lengkap dan jelas."
}
```

Nilai harus berupa integer `0-100`, feedback bersifat opsional, dan tugas harus sudah lengkap menurut kontrak progress di atas. Identitas reviewer selalu diambil dari JWT admin aktif; client tidak dapat memilih `reviewerId`. Penilaian ulang mengganti nilai, feedback, waktu pemeriksaan, dan reviewer dengan admin terakhir.

Response detail admin memiliki object `reviews` yang selalu memuat kelima task type. Value-nya `null` jika belum dinilai, atau berisi `taskType`, `score`, `feedback`, `reviewedAt`, dan `reviewer` (`id`, `fullname`, `email`). Endpoint peserta tidak mengembalikan data review.
