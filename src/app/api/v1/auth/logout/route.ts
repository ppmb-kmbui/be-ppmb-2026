import serverResponse from "@/utils/serverResponse";

export async function POST() {
  const response = serverResponse({
    success: true,
    message: "Logout berhasil",
    status: 200,
  });
  response.cookies.set("ppmb_access_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
