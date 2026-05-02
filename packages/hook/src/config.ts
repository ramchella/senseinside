import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { SenseCheckMode } from "@senseinside/core/schema";

export const HookConfigSchema = z.object({
  mode: SenseCheckMode.default("observe"),
  promptVersion: z.string().default("1.0.0"),
  model: z.string().default("claude-haiku-4-5"),
  enabled: z.boolean().default(true),
});
export type HookConfig = z.infer<typeof HookConfigSchema>;

const DEFAULT_CONFIG: HookConfig = {
  mode: "observe",
  promptVersion: "1.0.0",
  model: "claude-haiku-4-5",
  enabled: true,
};

export function configPath(): string {
  return join(homedir(), ".senseinside", "config.json");
}

export async function loadHookConfig(): Promise<HookConfig> {
  try {
    const raw = await readFile(configPath(), "utf8");
    const parsed = HookConfigSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}
