import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  type ActionLogEntry,
  ActionLogEntrySchema,
} from "@senseinside/core/schema";

export function actionLogPath(): string {
  return join(homedir(), ".senseinside", "private-brain", "logs", "action-log.jsonl");
}

export function errorLogPath(): string {
  return join(homedir(), ".senseinside", "logs", "hook-errors.jsonl");
}

export async function appendActionLog(entry: ActionLogEntry): Promise<void> {
  const validated = ActionLogEntrySchema.parse(entry);
  const path = actionLogPath();
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(validated)}\n`, "utf8");
}

export async function appendErrorLog(record: {
  timestamp: string;
  stage: string;
  message: string;
  detail?: unknown;
}): Promise<void> {
  try {
    const path = errorLogPath();
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify(record)}\n`, "utf8");
  } catch {
    // never throw from error logger
  }
}
