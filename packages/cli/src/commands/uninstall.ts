import chalk from "chalk";
import { claudeSettingsPath, userVault } from "../paths.js";
import { pathExists } from "../util/fs.js";
import { unregisterHook } from "../util/settings.js";

export async function uninstallCommand(): Promise<void> {
  console.log(chalk.bold.cyan("\nSenseInside — uninstall\n"));

  const settingsPath = claudeSettingsPath();
  if (await pathExists(settingsPath)) {
    const { removed } = await unregisterHook(settingsPath);
    if (removed) console.log(chalk.green(`  ✓ Removed PreToolUse hook from ${settingsPath}`));
    else console.log(chalk.gray(`  · No SenseInside hook entry found in ${settingsPath}`));
  } else {
    console.log(chalk.gray(`  · ${settingsPath} not found`));
  }

  console.log(chalk.gray("\nYour identity vault was NOT deleted (it is yours):"));
  console.log(chalk.gray(`    ${userVault()}`));
  console.log(chalk.gray("Remove it manually with `rm -rf ~/.senseinside` if you want a clean slate."));
}
