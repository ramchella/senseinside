import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const requireFromHere = createRequire(import.meta.url);

export function userHome(): string {
  return join(homedir(), ".senseinside");
}

export function userVault(): string {
  return join(userHome(), "private-brain");
}

export function userBin(): string {
  return join(userHome(), "bin");
}

export function userHookPath(): string {
  return join(userBin(), "pretool.cjs");
}

export function userConfigPath(): string {
  return join(userHome(), "config.json");
}

export function projectVault(cwd: string = process.cwd()): string {
  return join(cwd, ".senseinside", "private-brain");
}

export function claudeAgentsDir(cwd: string = process.cwd()): string {
  return join(cwd, ".claude", "agents");
}

export function claudeSettingsPath(cwd: string = process.cwd()): string {
  return join(cwd, ".claude", "settings.json");
}

export function bundledTemplatesDir(): string {
  return resolve(HERE, "templates");
}

export function bundledHookPath(): string {
  try {
    const pkgJson = requireFromHere.resolve("@senseinside/hook/package.json");
    return join(dirname(pkgJson), "dist", "pretool.cjs");
  } catch {
    // Fallbacks for varied install layouts (workspace root, sibling package, nested install)
    const candidates = [
      resolve(HERE, "..", "node_modules", "@senseinside", "hook", "dist", "pretool.cjs"),
      resolve(HERE, "..", "..", "..", "node_modules", "@senseinside", "hook", "dist", "pretool.cjs"),
      resolve(HERE, "..", "..", "hook", "dist", "pretool.cjs"),
    ];
    return candidates[0]!;
  }
}
