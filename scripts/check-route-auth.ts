import { NextRequest } from "next/server";
import { SignJWT } from "jose";

import { authenticateRequest } from "../src/lib/auth";
import { TASK_DEADLINE_ENV_KEYS } from "../src/lib/taskDeadline";

import * as adminTasks from "../src/app/api/v1/admin/tasks/[id]/route";
import * as adminUsers from "../src/app/api/v1/admin/users/route";
import * as authProfile from "../src/app/api/v1/auth/profile/route";
import * as connect from "../src/app/api/v1/connect/route";
import * as connectById from "../src/app/api/v1/connect/[id]/route";
import * as connectionRequests from "../src/app/api/v1/connection-requests/route";
import * as friends from "../src/app/api/v1/friends/route";
import * as materials from "../src/app/api/v1/materials/route";
import * as profile from "../src/app/api/v1/profile/route";
import * as quotes from "../src/app/api/v1/quotes/route";
import * as explorer from "../src/app/api/v1/tasks/explorer/route";
import * as fossib from "../src/app/api/v1/tasks/fossib/route";
import * as insightHunting from "../src/app/api/v1/tasks/insight-hunting/route";
import * as mentoring from "../src/app/api/v1/tasks/mentoring/route";
import * as mentoringVideos from "../src/app/api/v1/tasks/mentoring/videos/route";
import * as networking from "../src/app/api/v1/tasks/networking/route";
import * as networkingByFriend from "../src/app/api/v1/tasks/networking/[friendId]/route";
import * as tasks from "../src/app/api/v1/tasks/route";

type Check = {
  name: string;
  run: () => Promise<Response>;
};

const request = (path: string, method = "GET") =>
  new NextRequest(`http://localhost:4000${path}`, { method });

const requestWithToken = (path: string, token: string, method = "POST") =>
  new NextRequest(`http://localhost:4000${path}`, {
    method,
    headers: { authorization: `Bearer ${token}` },
  });

const params = { params: Promise.resolve({ id: "1" }) };
const friendParams = { params: Promise.resolve({ friendId: "1" }) };

const checks: Check[] = [
  { name: "auth/profile GET", run: () => authProfile.GET(request("/api/v1/auth/profile")) },
  { name: "profile GET", run: () => profile.GET(request("/api/v1/profile")) },
  { name: "profile PUT", run: () => profile.PUT(request("/api/v1/profile", "PUT")) },
  { name: "connect GET", run: () => connect.GET(request("/api/v1/connect")) },
  { name: "connect/:id POST", run: () => connectById.POST(request("/api/v1/connect/1", "POST"), params) },
  { name: "connect/:id PUT", run: () => connectById.PUT(request("/api/v1/connect/1", "PUT"), params) },
  { name: "connect/:id DELETE", run: () => connectById.DELETE(request("/api/v1/connect/1", "DELETE"), params) },
  { name: "connection-requests GET", run: () => connectionRequests.GET(request("/api/v1/connection-requests")) },
  { name: "friends GET", run: () => friends.GET(request("/api/v1/friends")) },
  { name: "materials GET", run: () => materials.GET(request("/api/v1/materials")) },
  { name: "quotes GET", run: () => quotes.GET(request("/api/v1/quotes")) },
  { name: "quotes POST", run: () => quotes.POST(request("/api/v1/quotes", "POST")) },
  { name: "tasks GET", run: () => tasks.GET(request("/api/v1/tasks")) },
  { name: "tasks/networking GET", run: () => networking.GET(request("/api/v1/tasks/networking")) },
  { name: "tasks/networking/:friendId GET", run: () => networkingByFriend.GET(request("/api/v1/tasks/networking/1"), friendParams) },
  { name: "tasks/networking/:friendId PUT", run: () => networkingByFriend.PUT(request("/api/v1/tasks/networking/1", "PUT"), friendParams) },
  { name: "explorer GET", run: () => explorer.GET(request("/api/v1/tasks/explorer")) },
  { name: "explorer POST", run: () => explorer.POST(request("/api/v1/tasks/explorer", "POST")) },
  { name: "fossib GET", run: () => fossib.GET(request("/api/v1/tasks/fossib")) },
  { name: "fossib POST", run: () => fossib.POST(request("/api/v1/tasks/fossib", "POST")) },
  { name: "insight-hunting GET", run: () => insightHunting.GET(request("/api/v1/tasks/insight-hunting")) },
  { name: "insight-hunting POST", run: () => insightHunting.POST(request("/api/v1/tasks/insight-hunting", "POST")) },
  { name: "mentoring GET", run: () => mentoring.GET(request("/api/v1/tasks/mentoring")) },
  { name: "mentoring POST", run: () => mentoring.POST(request("/api/v1/tasks/mentoring", "POST")) },
  { name: "mentoring/videos GET", run: () => mentoringVideos.GET(request("/api/v1/tasks/mentoring/videos")) },
  { name: "admin/users GET", run: () => adminUsers.GET(request("/api/v1/admin/users")) },
  { name: "admin/tasks/:id GET", run: () => adminTasks.GET(request("/api/v1/admin/tasks/1"), params) },
];

for (const check of checks) {
  const response = await check.run();
  if (response.status !== 401) {
    throw new Error(`${check.name} mengembalikan ${response.status}, seharusnya 401`);
  }
}

process.env.JWT_SECRET = "auth-route-test-secret-at-least-32-characters";
const token = await new SignJWT({ is_admin: false })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject("1")
  .setExpirationTime("5m")
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));

const bearerIdentity = await authenticateRequest(new NextRequest("http://localhost:4000/api/v1/profile", {
  headers: { authorization: `bearer ${token}` },
}));
const cookieIdentity = await authenticateRequest(new NextRequest("http://localhost:4000/api/v1/profile", {
  headers: { cookie: `ppmb_access_token=${token}` },
}));

if (bearerIdentity.userId !== 1 || cookieIdentity.userId !== 1) {
  throw new Error("JWT Bearer/cookie tidak menghasilkan userId yang benar");
}

const nonAdminResponse = await adminUsers.GET(new NextRequest("http://localhost:4000/api/v1/admin/users", {
  headers: { authorization: `Bearer ${token}` },
}));
if (nonAdminResponse.status !== 403) {
  throw new Error(`Admin route mengembalikan ${nonAdminResponse.status} untuk user non-admin, seharusnya 403`);
}

for (const envKey of Object.values(TASK_DEADLINE_ENV_KEYS)) {
  process.env[envKey] = "2000-01-01T00:00:00+07:00";
}

const closedDeadlineChecks: Check[] = [
  { name: "tasks/networking/:friendId PUT", run: () => networkingByFriend.PUT(requestWithToken("/api/v1/tasks/networking/1", token, "PUT"), friendParams) },
  { name: "explorer POST", run: () => explorer.POST(requestWithToken("/api/v1/tasks/explorer", token)) },
  { name: "fossib POST", run: () => fossib.POST(requestWithToken("/api/v1/tasks/fossib", token)) },
  { name: "insight-hunting POST", run: () => insightHunting.POST(requestWithToken("/api/v1/tasks/insight-hunting", token)) },
  { name: "mentoring POST", run: () => mentoring.POST(requestWithToken("/api/v1/tasks/mentoring", token)) },
];

for (const check of closedDeadlineChecks) {
  const response = await check.run();
  const body = await response.json();
  if (response.status !== 403 || body.message !== "Pengumpulan tugas sudah ditutup.") {
    throw new Error(`${check.name} tidak menolak submission setelah deadline dengan respons 403 yang benar`);
  }
}

console.log(`${checks.length} protected route handlers menolak request tanpa JWT dengan status 401.`);
console.log("Bearer case-insensitive, cookie auth, dan admin 403 tervalidasi.");
console.log(`${closedDeadlineChecks.length} endpoint submission menolak request setelah deadline.`);
