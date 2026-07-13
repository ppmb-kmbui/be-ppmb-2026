import serverResponse from "@/utils/serverResponse";
import { z } from "zod";

export function isHttpsUrl(value: string, hostname?: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (hostname === undefined || url.hostname === hostname);
  } catch {
    return false;
  }
}

export function isPdfUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

export function isImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;

    const pathname = url.pathname.toLowerCase();
    if (url.hostname === "res.cloudinary.com" && pathname.includes("/image/upload/")) {
      return true;
    }

    return /\.(png|jpe?g|webp|gif|heic|avif)$/.test(pathname) ||
      /\/(png|jpe?g|webp|gif|heic|avif)$/.test(pathname);
  } catch {
    return false;
  }
}

export function urlResourceKey(value: string): string | null {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function googleDocsResourceId(value: string | null | undefined): string | null {
  if (!value || !isHttpsUrl(value, "docs.google.com")) return null;

  const segments = new URL(value).pathname.split("/").filter(Boolean);
  if (segments[0] !== "document") return null;

  let dIndex: number;
  if (segments[1] === "d") {
    dIndex = 1;
  } else if (segments[1] === "u" && /^\d+$/.test(segments[2] ?? "") && segments[3] === "d") {
    dIndex = 3;
  } else {
    return null;
  }

  const candidate = segments[dIndex + 1];
  if (!candidate) return null;
  if (candidate === "e") {
    return segments[dIndex + 2] ? `e/${segments[dIndex + 2]}` : null;
  }
  return candidate;
}

export function isGoogleDriveResourceUrl(value: string | null | undefined): boolean {
  if (!value || !isHttpsUrl(value, "drive.google.com")) return false;

  const url = new URL(value);
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] === "file" && segments[1] === "d" && segments[2]) {
    return true;
  }

  if (segments[0] === "drive" && segments[1] === "folders" && segments[2]) return true;
  if (
    segments[0] === "drive" &&
    segments[1] === "u" &&
    /^\d+$/.test(segments[2] ?? "") &&
    segments[3] === "folders" &&
    segments[4]
  ) {
    return true;
  }

  return url.pathname === "/open" && Boolean(url.searchParams.get("id"));
}

export function taskSubmissionErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return serverResponse({
      success: false,
      message: "Validasi gagal",
      error: error.errors,
      status: 400,
    });
  }

  if (error instanceof SyntaxError) {
    return serverResponse({
      success: false,
      message: "Validasi gagal",
      error: "Body JSON tidak valid",
      status: 400,
    });
  }

  console.error("Task submission gagal", error);
  return serverResponse({
    success: false,
    message: "Terjadi kesalahan internal",
    error: "INTERNAL_SERVER_ERROR",
    status: 500,
  });
}
