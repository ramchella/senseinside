import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, mkdir, copyFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ActionLogEntrySchema } from "../packages/core/src/sensecheck/schema.js";

const exec = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const HOOK_BUNDLE = join(REPO, "packages", "hook", "dist", "pretool.cjs");

let SANDBOX = "";
let HOME = "";
let LOG_PATH = "";

beforeAll(async () => {
  SANDBOX = await mkdtemp(join(tmpdir(), "senseinside-e2e-"));
  HOME = join(SANDBOX, "home");
  await mkdir(join(HOME, ".senseinside", "bin"), { recursive: true });
  await mkdir(join(HOME, ".senseinside", "private-brain", "logs"), { recursive: true });
  await mkdir(join(HOME, ".senseinside", "logs"), { recursive: true });
  await mkdir(join(HOME, ".senseinside", "private-brain", "identity"), { recursive: true });
  await mkdir(join(HOME, ".senseinside", "private-brain", "governor"), { recursive: true });

  await writeFile(
    join(HOME, ".senseinside", "config.json"),
    JSON.stringify(
      { mode: "observe", promptVersion: "1.0.0", model: "claude-haiku-4-5", enabled: true },
      null,
      2,
    ),
  );

  await writeFile(
    join(HOME, ".senseinside", "private-brain", "identity", "user-identity.md"),
    `---\ntier: 0\ntype: identity\nupdated: 2026-05-03\n---\n# Core Identity\nFounder.\n`,
  );

  await writeFile(
    join(HOME, ".senseinside", "private-brain", "governor", "rules.md"),
    `---\ntier: 1\ntype: rules\nupdated: 2026-05-03\n---\n# Rules\n1. Never force-push to main.\n`,
  );

  const hookDest = join(HOME, ".senseinside", "bin", "pretool.cjs");
  await copyFile(HOOK_BUNDLE, hookDest);
  await chmod(hookDest, 0o755);

  LOG_PATH = join(HOME, ".senseinside", "private-brain", "logs", "action-log.jsonl");
});

afterAll(async () => {
  if (SANDBOX) await rm(SANDBOX, { recursive: true, force: true });
});

describe("hook end-to-end (Observe Mode)", () => {
  it("exits 0 and writes a log entry on a benign payload", async () => {
    const payload = JSON.stringify({
      session_id: "test-session",
      cwd: SANDBOX,
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "echo hello" },
    });

    const hookPath = join(HOME, ".senseinside", "bin", "pretool.cjs");
    const { stdout, stderr } = await runHookWithStdin(hookPath, payload);

    expect(stdout).toBe("");
    expect(stderr).toBe("");

    const log = await readFile(LOG_PATH, "utf8").catch(() => "");
    const lines = log.split("\n").filter((l) => l.trim().length > 0);
    expect(lines.length).toBeGreaterThan(0);

    const last = ActionLogEntrySchema.parse(JSON.parse(lines[lines.length - 1]!));
    expect(last.toolName).toBe("Bash");
    expect(last.mode).toBe("observe");
    expect(last.outcome).toBe("logged_only");
    expect(["ALLOW", "ALLOW_WITH_WARNING", "REWRITE_ACTION", "REQUIRE_APPROVAL", "BLOCK"]).toContain(
      last.decision,
    );
  }, 30_000);

  it("exits 0 even on malformed stdin", async () => {
    const hookPath = join(HOME, ".senseinside", "bin", "pretool.cjs");
    const { stdout, stderr, code } = await runHookWithStdin(hookPath, "not json at all");
    expect(code).toBe(0);
    expect(stdout).toBe("");
    expect(stderr).toBe("");
  });

  it("exits 0 even on empty stdin", async () => {
    const hookPath = join(HOME, ".senseinside", "bin", "pretool.cjs");
    const { code } = await runHookWithStdin(hookPath, "");
    expect(code).toBe(0);
  });
});

interface HookRunResult {
  stdout: string;
  stderr: string;
  code: number;
}

function runHookWithStdin(hookPath: string, stdinPayload: string): Promise<HookRunResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = execFile(
      process.execPath,
      [hookPath],
      { env: { ...process.env, HOME, USERPROFILE: HOME } },
      (err, stdout, stderr) => {
        const code = err && typeof (err as { code?: number }).code === "number" ? (err as { code?: number }).code! : 0;
        resolvePromise({ stdout: String(stdout), stderr: String(stderr), code });
      },
    );
    if (child.stdin) {
      child.stdin.write(stdinPayload);
      child.stdin.end();
    } else {
      rejectPromise(new Error("no stdin on child"));
    }
  });
}
