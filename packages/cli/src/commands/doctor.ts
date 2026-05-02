import { readFile } from "node:fs/promises";
import chalk from "chalk";
import { PROMPT_VERSION } from "@senseinside/core";
import {
  claudeSettingsPath,
  userBin,
  userConfigPath,
  userHookPath,
  userVault,
} from "../paths.js";
import { pathExists, readJson } from "../util/fs.js";
import { isHookRegistered } from "../util/settings.js";

interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export async function doctorCommand(): Promise<void> {
  const checks: DoctorCheck[] = [];

  checks.push({
    name: "Hook bundle present",
    ok: await pathExists(userHookPath()),
    detail: userHookPath(),
  });

  checks.push({
    name: "User vault present",
    ok: await pathExists(userVault()),
    detail: userVault(),
  });

  const config = await readJson<{
    mode?: string;
    promptVersion?: string;
    model?: string;
    enabled?: boolean;
  }>(userConfigPath());
  checks.push({
    name: "Config file readable",
    ok: !!config,
    detail: config ? JSON.stringify(config) : `missing ${userConfigPath()}`,
  });

  checks.push({
    name: "Prompt version aligned",
    ok: !!config?.promptVersion && config.promptVersion === PROMPT_VERSION,
    detail: `installed=${config?.promptVersion ?? "?"}, runtime=${PROMPT_VERSION}`,
  });

  checks.push({
    name: "ANTHROPIC_API_KEY set",
    ok: !!process.env.ANTHROPIC_API_KEY,
    detail: process.env.ANTHROPIC_API_KEY ? "present" : "not set",
  });

  const settingsPath = claudeSettingsPath();
  if (await pathExists(settingsPath)) {
    const registered = await isHookRegistered(settingsPath);
    checks.push({
      name: "Claude PreToolUse hook registered (project)",
      ok: registered,
      detail: settingsPath,
    });
  } else {
    checks.push({
      name: "Claude PreToolUse hook registered (project)",
      ok: false,
      detail: `${settingsPath} not found`,
    });
  }

  checks.push({
    name: "User bin dir exists",
    ok: await pathExists(userBin()),
    detail: userBin(),
  });

  console.log(chalk.bold.cyan("\nSenseInside doctor\n"));
  for (const c of checks) {
    const mark = c.ok ? chalk.green("✓") : chalk.red("✗");
    console.log(`  ${mark} ${c.name.padEnd(45)} ${chalk.gray(c.detail)}`);
  }

  if (await pathExists(userConfigPath())) {
    const raw = await readFile(userConfigPath(), "utf8").catch(() => "");
    if (raw) {
      console.log(chalk.gray(`\nConfig:\n${raw}`));
    }
  }

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    console.log(chalk.yellow(`\n${failed.length} check(s) failed.`));
    process.exit(1);
  }
  console.log(chalk.green("\nAll checks passed."));
}
