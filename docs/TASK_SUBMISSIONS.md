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

Link Google Docs dan Google Drive tidak diunggah ke backend. Peserta menempelkan link share, lalu frontend mengirim link tersebut sebagai JSON.

## Networking

Endpoint:

- `GET /api/v1/tasks/networking`
- `POST /api/v1/tasks/networking`

Payload canonical:

```json
{
  "first_docs_url": "https://docs.google.com/document/d/.../edit",
  "second_docs_url": "https://docs.google.com/document/d/.../edit"
}
```

Kedua field harus mengarah ke dua dokumen Google Docs yang berbeda. Homepage Docs, Sheets, Slides, dan link dokumen yang sama pada kedua field akan ditolak. POST boleh mengirim salah satu field untuk menyimpan progres parsial tanpa menghapus field lainnya.

Progress Networking:

- belum ada link: `completed: 0`, `required: 2`;
- satu link: `completed: 1`, `required: 2`;
- dua link: `completed: 2`, `required: 2`.

Networking tidak lagi memakai quota angkatan, target user, PDF, atau endpoint `networking-maba`/`networking-kating`.

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
| Networking | 0-2 | 2 |
| KMBUI Explorer | 0-1 | 1 |
| Mentoring | 0-1 | 1 |
| FOSSIB | 0-1 | 1 |
| Insight Hunting | 0-1 | 1 |

Endpoint tersebut masih mengembalikan beberapa field compatibility yang dibaca frontend saat ini, seperti `networkingAngkatan`, `networkingKating`, `firstFossibDone`, `secondFossibDone`, dan `mentoringReflectionDone`. Field compatibility bukan kontrak quota atau tugas baru; gunakan `cards` dan endpoint canonical di atas untuk integrasi baru.
