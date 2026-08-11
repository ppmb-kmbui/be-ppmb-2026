export const LIMIT = {};

export const CURRENT_BATCH = 2026;
export const IMAGE_MAX_UPLOAD_SIZE_MB = 5;
export const DOCUMENT_MAX_UPLOAD_SIZE_MB = 10;
// Vercel Functions reject request bodies above 4.5 MB. Keep enough room for
// multipart boundaries while proxying Insight Hunting PDFs through the API.
export const INSIGHT_HUNTING_SERVER_UPLOAD_MAX_SIZE_MB = 4;
