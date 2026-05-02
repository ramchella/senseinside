import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { reportCommand } from "./commands/report.js";
import { doctorCommand } from "./commands/doctor.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { modeCommand } from "./commands/mode.js";

const program = new Command();

program
  .name("sense-inside")
  .description("SenseInside — runtime identity governance for AI agents.")
  .version("0.1.0");

program
  .command("init")
  .description("Scaffold the local SenseInside vault and register the Claude Code hook.")
  .option("-y, --yes", "non-interactive (use defaults)")
  .option("--archetype <name>", "starter archetype (default: founder)")
  .action(async (opts) => {
    await initCommand({ yes: opts.yes, archetype: opts.archetype });
  });

program
  .command("report")
  .description("Print a summary of recent SenseCheck decisions from the action log.")
  .option("-d, --days <n>", "days of history (default: 7)", (v) => Number.parseInt(v, 10), 7)
  .action(async (opts) => {
    await reportCommand({ days: opts.days });
  });

program
  .command("doctor")
  .description("Diagnose the SenseInside install (paths, config, hook registration).")
  .action(async () => {
    await doctorCommand();
  });

program
  .command("mode [target]")
  .description("Print or set the operating mode. Phase 1a supports: observe.")
  .action(async (target?: string) => {
    await modeCommand(target);
  });

program
  .command("uninstall")
  .description("Remove the SenseInside hook from .claude/settings.json (vault is preserved).")
  .action(async () => {
    await uninstallCommand();
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
