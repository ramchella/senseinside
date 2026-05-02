import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

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
  return join(userBin(), "pretool.js");
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
  return resolve(HERE, "..", "node_modules", "@senseinside", "hook", "dist", "pretool.js");
}
