import chalk from "chalk";
import { SenseCheckMode } from "@senseinside/core/schema";
import { userConfigPath } from "../paths.js";
import { readJson, writeJson } from "../util/fs.js";

const ALLOWED_PHASE_1A: ReadonlyArray<string> = ["observe"];

export async function modeCommand(target?: string): Promise<void> {
  const config = (await readJson<Record<string, unknown>>(userConfigPath())) ?? {
    mode: "observe",
    promptVersion: "1.0.0",
    model: "claude-haiku-4-5",
    enabled: true,
  };

  if (!target) {
    console.log(chalk.bold(`Current mode: ${chalk.cyan(String(config.mode ?? "observe"))}`));
    return;
  }

  const parsed = SenseCheckMode.safeParse(target);
  if (!parsed.success) {
    console.log(chalk.red(`Unknown mode: ${target}`));
    console.log(chalk.gray("Valid: observe, intercept-critical, intercept-balanced, intercept-strict"));
    process.exit(1);
  }

  if (!ALLOWED_PHASE_1A.includes(parsed.data)) {
    console.log(
      chalk.yellow(
        `Phase 1a only supports 'observe'. '${parsed.data}' is reserved for Phase 1b. Sticking with observe.`,
      ),
    );
    return;
  }

  config.mode = parsed.data;
  await writeJson(userConfigPath(), config);
  console.log(chalk.green(`✓ Mode set to ${parsed.data}`));
}
