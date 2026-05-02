import { readJson, writeJson } from "./fs.js";

export const HOOK_MARKER = "senseinside-pretool";

export interface ClaudeHookEntry {
  type: "command";
  command: string;
}

export interface ClaudeHookGroup {
  matcher?: string;
  hooks: ClaudeHookEntry[];
}

export interface ClaudeSettings {
  hooks?: {
    PreToolUse?: ClaudeHookGroup[];
    [key: string]: ClaudeHookGroup[] | undefined;
  };
  [key: string]: unknown;
}

const DEFAULT_OBSERVE_MATCHER = "*";

export interface RegisterHookOptions {
  hookCommand: string;
  matcher?: string;
}

export async function registerHook(
  settingsPath: string,
  opts: RegisterHookOptions,
): Promise<{ added: boolean }> {
  const matcher = opts.matcher ?? DEFAULT_OBSERVE_MATCHER;
  const settings = ((await readJson<ClaudeSettings>(settingsPath)) ?? {}) as ClaudeSettings;
  settings.hooks = settings.hooks ?? {};
  const groups = settings.hooks.PreToolUse ?? [];

  for (const g of groups) {
    for (const h of g.hooks) {
      if (h.type === "command" && h.command.includes(HOOK_MARKER)) {
        return { added: false };
      }
    }
  }

  groups.push({
    matcher,
    hooks: [{ type: "command", command: opts.hookCommand }],
  });

  settings.hooks.PreToolUse = groups;
  await writeJson(settingsPath, settings);
  return { added: true };
}

export async function unregisterHook(
  settingsPath: string,
): Promise<{ removed: boolean }> {
  const settings = await readJson<ClaudeSettings>(settingsPath);
  if (!settings?.hooks?.PreToolUse) return { removed: false };

  let removed = false;
  const cleaned: ClaudeHookGroup[] = [];
  for (const group of settings.hooks.PreToolUse) {
    const filtered = group.hooks.filter(
      (h) => !(h.type === "command" && h.command.includes(HOOK_MARKER)),
    );
    if (filtered.length !== group.hooks.length) removed = true;
    if (filtered.length > 0) cleaned.push({ ...group, hooks: filtered });
  }

  if (cleaned.length === 0) {
    delete settings.hooks.PreToolUse;
  } else {
    settings.hooks.PreToolUse = cleaned;
  }
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;

  await writeJson(settingsPath, settings);
  return { removed };
}

export async function isHookRegistered(settingsPath: string): Promise<boolean> {
  const settings = await readJson<ClaudeSettings>(settingsPath);
  if (!settings?.hooks?.PreToolUse) return false;
  return settings.hooks.PreToolUse.some((g) =>
    g.hooks.some((h) => h.type === "command" && h.command.includes(HOOK_MARKER)),
  );
}
