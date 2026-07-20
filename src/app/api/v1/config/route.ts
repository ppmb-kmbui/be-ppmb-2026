import {
  CURRENT_BATCH,
  DOCUMENT_MAX_UPLOAD_SIZE_MB,
  IMAGE_MAX_UPLOAD_SIZE_MB,
} from "@/lib/const";
import {
  NETWORKING_BATCH_REQUIREMENTS,
  NETWORKING_REQUIRED_TOTAL,
} from "@/lib/networking";
import serverResponse from "@/utils/serverResponse";

export async function GET() {
  return serverResponse({
    success: true,
    message: "Konfigurasi aplikasi berhasil didapatkan",
    data: {
      currentBatch: CURRENT_BATCH,
      taskRequirements: {
        networkingFriends: NETWORKING_REQUIRED_TOTAL,
        networkingByBatch: NETWORKING_BATCH_REQUIREMENTS,
        networkingFixedQuestions: 3,
        networkingCustomQuestions: 1,
        networkingPhotos: NETWORKING_REQUIRED_TOTAL,
        explorerPhotos: 1,
        mentoringDriveLinks: 1,
        fossibPdfs: 1,
        fossibPhotos: 1,
        insightPdfs: 1,
      },
      upload: {
        // Kept as the absolute maximum for older clients.
        maxSizeMb: DOCUMENT_MAX_UPLOAD_SIZE_MB,
        imageMaxSizeMb: IMAGE_MAX_UPLOAD_SIZE_MB,
        documentMaxSizeMb: DOCUMENT_MAX_UPLOAD_SIZE_MB,
        profileImageTypes: ["image/png", "image/jpeg"],
        documentTypes: ["application/pdf"],
        videoTypes: ["video/mp4", "video/quicktime"],
      },
    },
    status: 200,
  });
}
