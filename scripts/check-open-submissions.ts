import assert from "node:assert/strict";
import { mock } from "node:test";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";

type Row = Record<string, unknown>;
const participant = { id: 1, fullname: "Peserta", email: "participant@example.com", batch: 2026, isAdmin: false, isSuperAdmin: false };
const friend = { id: 2, fullname: "Teman", batch: 2026, isAdmin: false, isSuperAdmin: false, isProfileHidden: false };
const admin = { id: 9, fullname: "Admin", batch: 2026, isAdmin: true, isSuperAdmin: false };
const senior = { id: 10, batch: 2025, isAdmin: false, isSuperAdmin: false };
const accounts = [participant, friend, admin, senior];

function submissionModel() {
  let row: Row | null = null;
  return {
    findUnique: async () => row,
    upsert: async ({ create, update }: { create: Row; update: Row }) => {
      row = row ? { ...row, ...update } : { id: 1, createdAt: new Date(), ...create };
      return row;
    },
  };
}

const explorerSubmission = submissionModel();
const insightHuntingSubmission = submissionModel();
const fossibSubmission = submissionModel();
const mentoringSubmission = submissionModel();
const legacyModel = { findUnique: async () => null };
const questions = ["PEER", "SENIOR"].flatMap((questionType, group) =>
  Array.from({ length: group === 0 ? 4 : 6 }, (_, index) => ({
    id: group * 10 + index + 1, code: `question-${index}`, prompt: `Pertanyaan ${index}`,
    position: index + 1, isCustom: index === (group === 0 ? 3 : 5), isActive: true, questionType,
  })),
);
let networkingRecord: Row | null = null;
let answers: Row[] = [];
function networkingRows() {
  return networkingRecord ? [{
    ...networkingRecord, friend: { ...friend },
    answers: answers.map((answer) => ({
      ...answer, question: questions.find(({ id }) => id === answer.questionId)!,
    })),
  }] : [];
}
const fakePrisma = {
  user: {
    findUnique: async ({ where }: { where: { id: number } }) => accounts.find(({ id }) => id === where.id) ?? null,
    findFirst: async ({ where }: { where: { id: number; batch?: number; isAdmin?: boolean } }) =>
      accounts.find((account) => account.id === where.id &&
        (where.batch === undefined || account.batch === where.batch) &&
        (where.isAdmin === undefined || account.isAdmin === where.isAdmin)) ?? null,
    findMany: async ({ select }: { select: Record<string, unknown> }) => {
      if (select.NetworkingSubmissions) {
        return [{
          ...participant, NetworkingSubmissions: networkingRows(),
          ConnectionSender: [{ toId: friend.id }], ConnectionReciever: [{ fromId: friend.id }],
          ExplorerSubmission: [await explorerSubmission.findUnique()].filter(Boolean),
          InsightHuntingSubmission: [await insightHuntingSubmission.findUnique()].filter(Boolean),
          FossibSubmission: await fossibSubmission.findUnique(),
          MentoringSubmission: await mentoringSubmission.findUnique(),
        }];
      }
      return friend.isProfileHidden ? [] : [{ ...friend }];
    },
    count: async () => 1,
  },
  networkingQuestion: {
    findMany: async ({ where }: { where: { questionType?: string } }) =>
      questions.filter((question) => !where.questionType || question.questionType === where.questionType),
  },
  networkingSubmission: {
    findMany: async () => networkingRows(),
    upsert: async ({ create, update }: { create: Row; update: Row }) => {
      networkingRecord = networkingRecord
        ? { ...networkingRecord, ...update }
        : { id: 1, createdAt: new Date(), ...create };
      return networkingRecord;
    },
    findUniqueOrThrow: async () => networkingRows()[0],
  },
  networkingAnswer: {
    deleteMany: async () => { answers = []; },
    createMany: async ({ data }: { data: Row[] }) => { answers = data; },
  },
  explorerSubmission, insightHuntingSubmission, fossibSubmission, mentoringSubmission,
  mentoringVlogSubmission: legacyModel, mentoringReflection: legacyModel,
  firstFossibSessionSubmission: legacyModel, secondFossibSessionSubmission: legacyModel,
  taskReview: { findMany: async () => [] },
  $transaction: async (callback: (transaction: object) => Promise<unknown>): Promise<unknown> => callback(fakePrisma),
};
Object.defineProperty(globalThis, "__prisma", { configurable: true, writable: true, value: fakePrisma });

process.env.JWT_SECRET = "open-submission-test-secret-at-least-32-characters";
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-key";
process.env.CLOUDINARY_API_SECRET = "test-secret";
const secret = new TextEncoder().encode(process.env.JWT_SECRET);
async function tokenFor(id: number) {
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(String(id))
    .setExpirationTime(4_000_000_000).sign(secret);
}
const participantToken = await tokenFor(1);
const adminToken = await tokenFor(9);
const seniorToken = await tokenFor(10);
const imageUrl = "https://res.cloudinary.com/test-cloud/image/upload/photo.jpg";
const pdfUrl = "https://res.cloudinary.com/test-cloud/raw/upload/task.pdf";
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => Response.json({ secure_url: pdfUrl });

const explorer = await import("../src/app/api/v1/tasks/explorer/route");
const insight = await import("../src/app/api/v1/tasks/insight-hunting/route");
const upload = await import("../src/app/api/v1/tasks/insight-hunting/upload/route");
const fossib = await import("../src/app/api/v1/tasks/fossib/route");
const mentoring = await import("../src/app/api/v1/tasks/mentoring/route");
const networking = await import("../src/app/api/v1/tasks/networking/[friendId]/route");
const adminDetail = await import("../src/app/api/v1/admin/tasks/[id]/route");
const adminList = await import("../src/app/api/v1/admin/users/route");

function request(method: string, body?: Row | FormData, token = participantToken) {
  const headers = new Headers({ authorization: `Bearer ${token}` });
  if (body && !(body instanceof FormData)) headers.set("content-type", "application/json");
  return new NextRequest("http://localhost:4000/api/v1/test", {
    method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
}

async function submitAll() {
  // Attempted client timestamps are stripped; the server sets the saved time.
  const responses = [
    await explorer.POST(request("POST", { activity_name: "Kegiatan", photo_url: imageUrl, submittedAt: "2000-01-01" })),
    await insight.POST(request("POST", { file_url: pdfUrl, submittedAt: "2000-01-01" })),
    await fossib.POST(request("POST", { file_url: pdfUrl, photo_url: imageUrl, updatedAt: "2000-01-01" })),
    await mentoring.POST(request("POST", { gdrive_url: "https://drive.google.com/file/d/test/view", updatedAt: "2000-01-01" })),
    await networking.PUT(request("PUT", {
      photo_url: imageUrl,
      answers: [1, 2, 3].map((question_id) => ({ question_id, answer: "Jawaban" })),
      custom_question: "Pertanyaan bebas?", custom_answer: "Jawaban bebas",
    }), { params: Promise.resolve({ friendId: "2" }) }),
  ];
  const form = new FormData();
  form.append("file", new Blob(["%PDF-1.7\n%%EOF"], { type: "application/pdf" }), "insight.pdf");
  responses.push(await upload.POST(request("POST", form)));
  for (const response of responses) assert.equal(response.status, 200, JSON.stringify(await response.json()));
}

async function readAdmin() {
  const detailResponse = await adminDetail.GET(request("GET", undefined, adminToken), { params: Promise.resolve({ id: "1" }) });
  const listResponse = await adminList.GET(request("GET", undefined, adminToken));
  assert.equal(detailResponse.status, 200);
  assert.equal(listResponse.status, 200);
  const detail = (await detailResponse.json()).data;
  const list = (await listResponse.json()).data.users[0];
  assert.deepEqual(list.submissionTiming, detail.submissionTiming);
  return { detail, list };
}

const legacyDeadlineKeys = ["NETWORKING", "EXPLORER", "MENTORING", "FOSSIB", "INSIGHT_HUNTING"]
  .map((task) => `TASK_DEADLINE_${task}`);
mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-05T23:59:59.999+07:00") });
try {
  // An existing submission without a recorded time must not get a made-up label.
  await explorerSubmission.upsert({ create: { userId: 1, activityName: "Legacy", img_url: imageUrl, submittedAt: null }, update: {} });
  await insightHuntingSubmission.upsert({ create: { userId: 1, file_url: pdfUrl, submittedAt: null }, update: {} });
  const legacy = await readAdmin();
  assert.deepEqual(legacy.detail.submissionTiming.explorer, { submittedAt: null, isLate: null });
  assert.deepEqual(legacy.detail.submissionTiming["insight-hunting"], { submittedAt: null, isLate: null });
  assert.equal(legacy.list.lateTaskCount, 0);

  for (const key of legacyDeadlineKeys) process.env[key] = "2020-01-01T00:00:00+07:00";
  await submitAll();
  const onTime = await readAdmin();
  assert.equal(onTime.list.lateTaskCount, 0);
  for (const timing of Object.values(onTime.detail.submissionTiming) as Row[]) {
    assert.deepEqual(timing, { submittedAt: "2026-09-05T16:59:59.999Z", isLate: false });
  }

  // Repeat identical submissions: even an edit with unchanged URLs uses the new time.
  for (const [index, oldConfig] of ["2020-01-01T00:00:00+07:00", undefined, "invalid"].entries()) {
    mock.timers.setTime(new Date("2026-09-05T17:00:00.000Z").getTime() + index * 1000);
    for (const key of legacyDeadlineKeys) {
      if (oldConfig === undefined) delete process.env[key];
      else process.env[key] = oldConfig;
    }
    await submitAll();
    const { detail, list } = await readAdmin();
    assert.equal(list.lateTaskCount, 5);
    assert.equal(detail.status.networking, false); // Partial Networking is still labeled late.
    for (const timing of Object.values(detail.submissionTiming) as Row[]) {
      assert.deepEqual(timing, { submittedAt: new Date().toISOString(), isLate: true });
    }
  }

  friend.isProfileHidden = true;
  const hidden = await readAdmin();
  assert.deepEqual(hidden.detail.submissions.networking, []);
  assert.equal(hidden.detail.submissionTiming.networking.isLate, true);
  assert.equal(hidden.list.lateTaskCount, 5);

  const beforeInvalid = await explorerSubmission.findUnique();
  mock.timers.setTime(Date.now() + 1000);
  assert.equal((await explorer.POST(request("POST", { activity_name: "", photo_url: imageUrl }))).status, 400);
  assert.deepEqual(await explorerSubmission.findUnique(), beforeInvalid);
  assert.equal((await explorer.POST(request("POST", { activity_name: "Kegiatan", photo_url: imageUrl }, seniorToken))).status, 403);
  assert.equal((await adminList.GET(request("GET"))).status, 403);
} finally {
  mock.timers.reset();
  globalThis.fetch = originalFetch;
}
console.log("Semua 6 jalur submission tetap terbuka; timestamp server, edit, 5 label admin, dan visibilitas profil lulus.");
