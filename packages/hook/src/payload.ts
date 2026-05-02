import { createHash } from "node:crypto";
import { z } from "zod";
import { type ProposedAction, ProposedActionSchema } from "@senseinside/core/schema";

const ClaudeHookPayloadSchema = z.object({
  session_id: z.string().optional(),
  transcript_path: z.string().optional(),
  cwd: z.string().optional(),
  hook_event_name: z.string().optional(),
  tool_name: z.string(),
  tool_input: z.record(z.unknown()),
});
export type ClaudeHookPayload = z.infer<typeof ClaudeHookPayloadSchema>;

export function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

export function parsePayload(raw: string): ClaudeHookPayload {
  const json = JSON.parse(raw);
  return ClaudeHookPayloadSchema.parse(json);
}

export function toProposedAction(payload: ClaudeHookPayload): ProposedAction {
  const actionSignature = createHash("sha256")
    .update(`${payload.tool_name}|${stableStringify(payload.tool_input)}`)
    .digest("hex");

  return ProposedActionSchema.parse({
    toolName: payload.tool_name,
    toolInput: payload.tool_input,
    sessionId: payload.session_id,
    transcriptPath: payload.transcript_path,
    cwd: payload.cwd,
    hookEventName: "PreToolUse",
    actionSignature,
    timestamp: new Date().toISOString(),
  });
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_, v) => {
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (v as Record<string, unknown>)[k];
          return acc;
        }, {});
    }
    return v;
  });
}
