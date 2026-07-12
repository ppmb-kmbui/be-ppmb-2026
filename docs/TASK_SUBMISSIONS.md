# Kontrak Submission Tugas PPMB 2026

## Alur upload

Backend menerima URL, bukan file mentah atau `multipart/form-data`.

1. Frontend mengunggah foto/PDF/DOCX ke Cloudinary, atau peserta membuat folder/dokumen Google Drive.
2. Frontend mengambil URL hasil upload/share.
3. Frontend mengirim URL tersebut sebagai JSON ke endpoint backend.

Untuk upload Cloudinary unsigned dari frontend, frontend membutuhkan:

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

Jangan menaruh `CLOUDINARY_API_SECRET` di frontend. Backend ini tidak membutuhkan kredensial Cloudinary karena hanya menyimpan URL. Jika nanti memakai signed upload, signature harus dibuat oleh endpoint backend tersendiri.

Semua endpoint di bawah membutuhkan cookie HttpOnly `ppmb_access_token` atau header `Authorization: Bearer <token>`. Jika frontend memanggil backend secara cross-origin, gunakan `credentials: "include"`.

## Payload canonical

### Mentoring

`POST /api/v1/tasks/mentoring`

```json
{
  "gdrive_url": "https://drive.google.com/drive/folders/..."
}
```

Satu folder/link Google Drive menampung video dan TTS. Progress mentoring dihitung sebagai satu tugas.

### Networking maba

`PUT /api/v1/networking-maba/:id`

```json
{
  "file_url": "https://res.cloudinary.com/.../networking.pdf"
}
```

### Networking kating

`POST /api/v1/networking-kating/:id`

```json
{
  "file_url": "https://res.cloudinary.com/.../networking-kating.pdf"
}
```

PDF saja sudah cukup untuk menyelesaikan submission. Payload pertanyaan/deskripsi lama tetap diterima untuk kompatibilitas.

### Insight Hunting

`POST /api/v1/tasks/insight-hunting`

```json
{
  "docs_url": "https://docs.google.com/document/d/.../edit"
}
```

### FOSSIB sesi pertama/kedua

`POST /api/v1/tasks/fossib/first`

`POST /api/v1/tasks/fossib/second`

```json
{
  "docs_url": "https://docs.google.com/document/d/.../edit",
  "photo_url": "https://res.cloudinary.com/.../fossib.jpg"
}
```

Dokumen dan foto disimpan terpisah. Selama requirement FOSSIB belum dipastikan wajib keduanya, backend menerima minimal salah satu attachment atau deskripsi.

### KMBUI Explorer

`POST /api/v1/tasks/explorer`

```json
{
  "photo_url": "https://res.cloudinary.com/.../explorer.jpg"
}
```

Requirement terbaru hanya membutuhkan foto; `activityName` tidak disimpan.

### Video panitia

`GET /api/v1/tasks/mentoring/videos`

Data diambil dari `MaterialCategory` bernama `Video Panitia` beserta `Material` yang published. Seed sudah menyediakan contoh data.

## Alias kompatibilitas

Backend juga menerima nama field lama/alternatif berikut:

- Mentoring: `gdriveUrl`, `file_url`
- Networking: `pdf_url`, `pdfUrl`, dan legacy `img_url`
- Insight Hunting: `docsUrl`, `file_url`
- FOSSIB dokumen: `docsUrl`, `file_url`
- FOSSIB foto: `photoUrl`, legacy `img_url`
- Explorer: `photoUrl`, legacy `img_url`

Frontend baru sebaiknya memakai field canonical pada contoh di atas.
