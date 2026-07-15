import serverResponse from "@/utils/serverResponse";
import { z } from "zod";

export const TASK_DEADLINE_ENV_KEYS = {
  networking: "TASK_DEADLINE_NETWORKING",
  insightHunting: "TASK_DEADLINE_INSIGHT_HUNTING",
  explorer: "TASK_DEADLINE_EXPLORER",
  mentoring: "TASK_DEADLINE_MENTORING",
  fossib: "TASK_DEADLINE_FOSSIB",
} as const;

export type SubmissionTask = keyof typeof TASK_DEADLINE_ENV_KEYS;

type DeadlineEnvironment = Record<string, string | undefined>;

export type TaskDeadlineState =
  | { state: "open"; deadline: Date }
  | { state: "closed"; deadline: Date }
  | { state: "missing"; envKey: string }
  | { state: "invalid"; envKey: string; value: string };

const DeadlineValueSchema = z.string().datetime({ offset: true });

export function getTaskDeadlineState(
  task: SubmissionTask,
  now = new Date(),
  env: DeadlineEnvironment = process.env,
): TaskDeadlineState {
  const envKey = TASK_DEADLINE_ENV_KEYS[task];
  const value = env[envKey]?.trim();

  if (!value) {
    return { state: "missing", envKey };
  }

  const deadline = new Date(value);
  if (!DeadlineValueSchema.safeParse(value).success || Number.isNaN(deadline.getTime())) {
    return { state: "invalid", envKey, value };
  }

  return now.getTime() >= deadline.getTime()
    ? { state: "closed", deadline }
    : { state: "open", deadline };
}

export function taskDeadlineGuard(
  task: SubmissionTask,
  now = new Date(),
  env: DeadlineEnvironment = process.env,
) {
  const deadlineState = getTaskDeadlineState(task, now, env);

  if (deadlineState.state === "closed") {
    return serverResponse({
      success: false,
      message: "Pengumpulan tugas sudah ditutup.",
      status: 403,
    });
  }

  if (deadlineState.state === "missing" || deadlineState.state === "invalid") {
    console.error(
      `Konfigurasi deadline ${deadlineState.envKey} ${deadlineState.state === "missing" ? "belum diisi" : "tidak valid"}`,
    );
    return serverResponse({
      success: false,
      message: "Konfigurasi deadline pengumpulan belum tersedia.",
      error: "TASK_DEADLINE_NOT_CONFIGURED",
      status: 503,
    });
  }

  return null;
}
