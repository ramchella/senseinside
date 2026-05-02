import { chmod, copyFile, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import chalk from "chalk";
import prompts from "prompts";
import { ProposedActionSchema, runSenseCheck } from "@senseinside/core";
import {
  bundledHookPath,
  bundledTemplatesDir,
  claudeAgentsDir,
  claudeSettingsPath,
  projectVault,
  userBin,
  userConfigPath,
  userHookPath,
  userVault,
} from "../paths.js";
import { copyDirectory, ensureDir, pathExists, writeJson } from "../util/fs.js";
import { registerHook } from "../util/settings.js";

const ARCHETYPES = [
  { title: "Founder", value: "founder", available: true },
  { title: "Engineering Lead (coming soon)", value: "engineering-lead", available: false },
  { title: "Sales Operator (coming soon)", value: "sales-operator", available: false },
  { title: "Content Creator (coming soon)", value: "content-creator", available: false },
  { title: "Personal Assistant (coming soon)", value: "personal-assistant", available: false },
];

export interface InitOptions {
  cwd?: string;
  yes?: boolean;
  archetype?: string;
}

export async function initCommand(opts: InitOptions = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  log.title("SenseInside — install");
  log.muted("Local, open-source identity governance for AI agents. Phase 1a: Observe Mode.\n");

  const archetype = await pickArchetype(opts);
  const apiKey = await ensureApiKey(opts.yes);

  await scaffoldVaults(archetype);
  await scaffoldProjectVault(cwd);
  await installHookBundle();
  await writeConfig();
  await writeSubagent(cwd);
  const registered = await registerSettingsHook(cwd);

  log.section("Verifying install");
  await runSmokeCheck(apiKey);

  log.section("Done");
  log.bullet(`User vault:       ${userVault()}`);
  log.bullet(`Project vault:    ${projectVault(cwd)}`);
  log.bullet(`Hook installed:   ${userHookPath()}`);
  log.bullet(`Subagent:         ${join(claudeAgentsDir(cwd), "sense-inside.md")}`);
  log.bullet(
    `Claude settings:  ${registered ? "PreToolUse hook registered" : "PreToolUse hook already present"}`,
  );
  log.muted(
    "\nMode: observe. Decisions will be logged but not enforced.\nRun `sense-inside report` after a few days of agent activity to see what was flagged.",
  );
}

async function pickArchetype(opts: InitOptions): Promise<string> {
  if (opts.archetype) return opts.archetype;
  if (opts.yes) return "founder";
  const res = await prompts({
    type: "select",
    name: "archetype",
    message: "Pick a starter identity archetype",
    choices: ARCHETYPES.map((a) => ({
      title: a.title,
      value: a.value,
      disabled: !a.available,
    })),
    initial: 0,
  });
  return res.archetype ?? "founder";
}

async function ensureApiKey(yes?: boolean): Promise<string> {
  const existing = process.env.ANTHROPIC_API_KEY;
  if (existing) {
    log.ok("ANTHROPIC_API_KEY detected in environment.");
    return existing;
  }

  if (yes) {
    log.warn(
      "ANTHROPIC_API_KEY is not set. SenseCheck calls will return synthetic 'REQUIRE_APPROVAL' decisions until you set it.",
    );
    return "";
  }

  const res = await prompts({
    type: "password",
    name: "key",
    message:
      "Paste your Anthropic API key (stored only in your shell env; never written by SenseInside)",
  });
  if (!res.key) {
    log.warn(
      "No key provided. SenseCheck will return synthetic safety-first decisions until you `export ANTHROPIC_API_KEY=...`.",
    );
    return "";
  }
  process.env.ANTHROPIC_API_KEY = res.key;
  log.ok("Key set for this session. Add `export ANTHROPIC_API_KEY=...` to your shell rc to persist.");
  return res.key;
}

async function scaffoldVaults(archetype: string): Promise<void> {
  log.section("Scaffolding user vault");
  await ensureDir(userVault());
  for (const sub of [
    "identity",
    "governor",
    "memory",
    "feedback",
    "logs",
    "inbox",
    "research",
  ]) {
    await ensureDir(join(userVault(), sub));
  }

  const archetypeDir = join(bundledTemplatesDir(), "archetypes", archetype);
  if (await pathExists(archetypeDir)) {
    await copyDirectory(archetypeDir, userVault());
    log.ok(`Archetype '${archetype}' applied (existing files preserved).`);
  } else {
    log.warn(`Archetype '${archetype}' not bundled; vault scaffolded empty.`);
  }
}

async function scaffoldProjectVault(cwd: string): Promise<void> {
  log.section("Scaffolding project vault");
  const root = projectVault(cwd);
  for (const sub of ["identity", "governor", "memory", "feedback"]) {
    await ensureDir(join(root, sub));
  }
  log.ok(`Project-level overrides go in: ${root}`);
}

async function installHookBundle(): Promise<void> {
  log.section("Installing hook bundle");
  await ensureDir(userBin());
  const src = bundledHookPath();
  if (!(await pathExists(src))) {
    log.warn(
      `Hook bundle not found at ${src}. Did you install @senseinside/hook? Falling back to npm-resolved binary.`,
    );
    return;
  }
  await copyFile(src, userHookPath());
  await chmod(userHookPath(), 0o755);
  log.ok(`Hook bundle copied to ${userHookPath()}`);
}

async function writeConfig(): Promise<void> {
  if (await pathExists(userConfigPath())) {
    log.muted("Config already exists; preserved.");
    return;
  }
  await writeJson(userConfigPath(), {
    mode: "observe",
    promptVersion: "1.0.0",
    model: "claude-haiku-4-5",
    enabled: true,
  });
  log.ok(`Wrote ${userConfigPath()}`);
}

async function writeSubagent(cwd: string): Promise<void> {
  log.section("Installing Claude Code subagent");
  const dir = claudeAgentsDir(cwd);
  await ensureDir(dir);
  const dst = join(dir, "sense-inside.md");
  if (await pathExists(dst)) {
    log.muted("Subagent already present; preserved.");
    return;
  }
  const src = join(bundledTemplatesDir(), "claude-agent", "sense-inside.md");
  if (!(await pathExists(src))) {
    log.warn(`Subagent template missing at ${src}; skipping.`);
    return;
  }
  const content = await readFile(src, "utf8");
  await writeFile(dst, content, "utf8");
  log.ok(`Subagent installed at ${dst}`);
}

async function registerSettingsHook(cwd: string): Promise<boolean> {
  log.section("Registering PreToolUse hook in .claude/settings.json");
  const settingsPath = claudeSettingsPath(cwd);
  await ensureDir(dirname(settingsPath));
  const command = `node ${userHookPath()} # senseinside-pretool`;
  const { added } = await registerHook(settingsPath, { hookCommand: command, matcher: "*" });
  if (added) log.ok(`Registered hook in ${settingsPath}`);
  else log.muted(`Hook already registered in ${settingsPath}`);
  return added;
}

async function runSmokeCheck(apiKey: string): Promise<void> {
  if (!apiKey) {
    log.warn("Skipping smoke check (no API key).");
    return;
  }
  const action = ProposedActionSchema.parse({
    toolName: "Bash",
    toolInput: { command: "echo 'sense-inside install verification'" },
    hookEventName: "PreToolUse",
    actionSignature: createHash("sha256").update("smoke").digest("hex"),
    timestamp: new Date().toISOString(),
  });
  try {
    const result = await runSenseCheck(action, "observe", { apiKey });
    log.ok(
      `SenseCheck OK — decision=${result.decision.decision}, confidence=${result.decision.confidence.toFixed(2)}, latency=${result.latencyMs}ms, cost=$${result.costUsd.toFixed(5)}`,
    );
  } catch (err) {
    log.warn(`Smoke check failed (non-fatal): ${(err as Error).message}`);
  }
}

const log = {
  title: (s: string) => console.log(chalk.bold.cyan(`\n${s}`)),
  section: (s: string) => console.log(chalk.bold(`\n• ${s}`)),
  bullet: (s: string) => console.log(`  ${s}`),
  ok: (s: string) => console.log(chalk.green(`  ✓ ${s}`)),
  warn: (s: string) => console.log(chalk.yellow(`  ! ${s}`)),
  muted: (s: string) => console.log(chalk.gray(s)),
};
