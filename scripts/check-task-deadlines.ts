import assert from "node:assert/strict";

import {
  getTaskDeadlineState,
  TASK_DEADLINE_ENV_KEYS,
  taskDeadlineGuard,
  type SubmissionTask,
} from "../src/lib/taskDeadline";

const tasks = Object.keys(TASK_DEADLINE_ENV_KEYS) as SubmissionTask[];

function captureConsoleError<T>(callback: () => T) {
  const originalConsoleError = console.error;
  const messages: unknown[][] = [];
  console.error = (...args: unknown[]) => messages.push(args);

  try {
    return { result: callback(), messages };
  } finally {
    console.error = originalConsoleError;
  }
}

for (const task of tasks) {
  const envKey = TASK_DEADLINE_ENV_KEYS[task];
  const env = { [envKey]: "2026-08-10T23:59:59+07:00" };

  assert.equal(
    getTaskDeadlineState(task, new Date("2026-08-10T16:59:58.999Z"), env).state,
    "open",
  );
  assert.equal(
    getTaskDeadlineState(task, new Date("2026-08-10T16:59:59.000Z"), env).state,
    "closed",
  );
  assert.equal(
    getTaskDeadlineState(task, new Date("2026-08-10T17:00:00.000Z"), env).state,
    "closed",
  );
  assert.equal(getTaskDeadlineState(task, new Date(), {}).state, "missing");
  assert.equal(
    getTaskDeadlineState(task, new Date(), { [envKey]: "10 Agustus 2026" }).state,
    "invalid",
  );
  assert.equal(
    getTaskDeadlineState(task, new Date(), { [envKey]: "2026-08-10T23:59:59" }).state,
    "invalid",
  );
  assert.equal(
    getTaskDeadlineState(task, new Date(), { [envKey]: "2026-02-30T23:59:59+07:00" }).state,
    "invalid",
  );

  assert.equal(
    taskDeadlineGuard(task, new Date("2026-08-10T16:59:58.999Z"), env),
    null,
  );

  const closedResponse = taskDeadlineGuard(
    task,
    new Date("2026-08-10T16:59:59.000Z"),
    env,
  );
  assert.equal(closedResponse?.status, 403);
  assert.deepEqual(await closedResponse?.json(), {
    success: false,
    message: "Pengumpulan tugas sudah ditutup.",
    status: 403,
  });

  const { result: missingResponse, messages } = captureConsoleError(
    () => taskDeadlineGuard(task, new Date(), {}),
  );
  assert.equal(messages.length, 1);
  assert.equal(missingResponse?.status, 503);
  assert.deepEqual(await missingResponse?.json(), {
    success: false,
    message: "Konfigurasi deadline pengumpulan belum tersedia.",
    error: "TASK_DEADLINE_NOT_CONFIGURED",
    status: 503,
  });
}

console.log("Validator deadline task lulus.");
