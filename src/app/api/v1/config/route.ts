import { CURRENT_BATCH, MAX_UPLOAD_SIZE_MB, NETWORKING_BATCHES } from "@/lib/const";
import serverResponse from "@/utils/serverResponse";

export async function GET() {
  return serverResponse({
    success: true,
    message: "Konfigurasi aplikasi berhasil didapatkan",
    data: {
      currentBatch: CURRENT_BATCH,
      networkingBatches: NETWORKING_BATCHES,
      upload: {
        maxSizeMb: MAX_UPLOAD_SIZE_MB,
        profileImageTypes: ["image/png", "image/jpeg"],
        documentTypes: ["application/pdf"],
        videoTypes: ["video/mp4", "video/quicktime"],
      },
    },
    status: 200,
  });
}
