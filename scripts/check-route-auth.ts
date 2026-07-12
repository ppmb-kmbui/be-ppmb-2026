import { NextRequest } from "next/server";
import { SignJWT } from "jose";

import { authenticateRequest } from "../src/lib/auth";

import * as adminTasks from "../src/app/api/v1/admin/tasks/[id]/route";
import * as adminUsers from "../src/app/api/v1/admin/users/route";
import * as authProfile from "../src/app/api/v1/auth/profile/route";
import * as connect from "../src/app/api/v1/connect/route";
import * as connectById from "../src/app/api/v1/connect/[id]/route";
import * as connectionRequests from "../src/app/api/v1/connection-requests/route";
import * as friends from "../src/app/api/v1/friends/route";
import * as networkingKating from "../src/app/api/v1/networking-kating/route";
import * as networkingKatingById from "../src/app/api/v1/networking-kating/[id]/route";
import * as networkingMaba from "../src/app/api/v1/networking-maba/route";
import * as networkingMabaById from "../src/app/api/v1/networking-maba/[id]/route";
import * as profile from "../src/app/api/v1/profile/route";
import * as quotes from "../src/app/api/v1/quotes/route";
import * as explorer from "../src/app/api/v1/tasks/explorer/route";
import * as firstFossib from "../src/app/api/v1/tasks/fossib/first/route";
import * as secondFossib from "../src/app/api/v1/tasks/fossib/second/route";
import * as insightHunting from "../src/app/api/v1/tasks/insight-hunting/route";
import * as mentoring from "../src/app/api/v1/tasks/mentoring/route";
import * as mentoringLegacy from "../src/app/api/v1/tasks/mentoring/[id]/route";
import * as mentoringVideos from "../src/app/api/v1/tasks/mentoring/videos/route";
import * as tasks from "../src/app/api/v1/tasks/route";

type Check = {
  name: string;
  run: () => Promise<Response>;
};

const request = (path: string, method = "GET") =>
  new NextRequest(`http://localhost:4000${path}`, { method });

const params = { params: Promise.resolve({ id: "1" }) };

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
  { name: "quotes POST", run: () => quotes.POST(request("/api/v1/quotes", "POST")) },
  { name: "networking-maba GET", run: () => networkingMaba.GET(request("/api/v1/networking-maba")) },
  { name: "networking-maba/:id GET", run: () => networkingMabaById.GET(request("/api/v1/networking-maba/1"), params) },
  { name: "networking-maba/:id POST", run: () => networkingMabaById.POST(request("/api/v1/networking-maba/1", "POST"), params) },
  { name: "networking-maba/:id PUT", run: () => networkingMabaById.PUT(request("/api/v1/networking-maba/1", "PUT"), params) },
  { name: "networking-kating GET", run: () => networkingKating.GET(request("/api/v1/networking-kating")) },
  { name: "networking-kating/:id GET", run: () => networkingKatingById.GET(request("/api/v1/networking-kating/1"), params) },
  { name: "networking-kating/:id POST", run: () => networkingKatingById.POST(request("/api/v1/networking-kating/1", "POST"), params) },
  { name: "tasks GET", run: () => tasks.GET(request("/api/v1/tasks")) },
  { name: "explorer GET", run: () => explorer.GET(request("/api/v1/tasks/explorer")) },
  { name: "explorer POST", run: () => explorer.POST(request("/api/v1/tasks/explorer", "POST")) },
  { name: "fossib/first GET", run: () => firstFossib.GET(request("/api/v1/tasks/fossib/first")) },
  { name: "fossib/first POST", run: () => firstFossib.POST(request("/api/v1/tasks/fossib/first", "POST")) },
  { name: "fossib/second GET", run: () => secondFossib.GET(request("/api/v1/tasks/fossib/second")) },
  { name: "fossib/second POST", run: () => secondFossib.POST(request("/api/v1/tasks/fossib/second", "POST")) },
  { name: "insight-hunting GET", run: () => insightHunting.GET(request("/api/v1/tasks/insight-hunting")) },
  { name: "insight-hunting POST", run: () => insightHunting.POST(request("/api/v1/tasks/insight-hunting", "POST")) },
  { name: "mentoring GET", run: () => mentoring.GET(request("/api/v1/tasks/mentoring")) },
  { name: "mentoring POST", run: () => mentoring.POST(request("/api/v1/tasks/mentoring", "POST")) },
  { name: "mentoring legacy POST", run: () => mentoringLegacy.POST(request("/api/v1/tasks/mentoring/vlog", "POST"), { params: Promise.resolve({ id: "vlog" }) }) },
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

console.log(`${checks.length} protected route handlers menolak request tanpa JWT dengan status 401.`);
console.log("Bearer case-insensitive, cookie auth, dan admin 403 tervalidasi.");
