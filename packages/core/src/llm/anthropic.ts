import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { type SenseCheckDecision, SenseCheckDecisionSchema } from "../sensecheck/schema.js";

export interface LlmCallResult {
  decision: SenseCheckDecision;
  model: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  synthesizedFallback: boolean;
}

export interface LlmCallOptions {
  apiKey?: string;
  model?: string;
  systemPrompt: string;
  timeoutMs?: number;
}

const DEFAULT_MODEL = "claude-haiku-4-5";
const HAIKU_INPUT_USD_PER_M = 1.0;
const HAIKU_OUTPUT_USD_PER_M = 5.0;

const TOOL_NAME = "record_sensecheck_decision";

const TOOL_SCHEMA = {
  name: TOOL_NAME,
  description:
    "Record your decision about whether the proposed agent action fits the user's identity, rules, and feedback.",
  input_schema: {
    type: "object",
    required: ["decision", "reasoning", "riskLevel", "citedSources", "confidence"],
    properties: {
      decision: {
        type: "string",
        enum: ["ALLOW", "ALLOW_WITH_WARNING", "REWRITE_ACTION", "REQUIRE_APPROVAL", "BLOCK"],
      },
      reasoning: { type: "string" },
      suggestedRewrite: { type: "string" },
      riskLevel: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
      citedSources: { type: "array", items: { type: "string" } },
      identityConflict: { type: "string" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
    },
  },
} as const;

export async function callSenseCheckLlm(opts: LlmCallOptions): Promise<LlmCallResult> {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  const model = opts.model ?? process.env.SENSEINSIDE_MODEL ?? DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? 10_000;

  if (!apiKey) return synthetic(model, "ANTHROPIC_API_KEY missing");

  const client = new Anthropic({ apiKey });
  const start = Date.now();

  try {
    const first = await client.messages.create(
      {
        model,
        max_tokens: 1024,
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "tool", name: TOOL_NAME },
        messages: [{ role: "user", content: opts.systemPrompt }],
      },
      { signal: AbortSignal.timeout(timeoutMs) },
    );

    const parsed = parseToolUse(first);
    if (parsed.success) {
      return finalize(parsed.value, model, start, first.usage);
    }

    const retry = await client.messages.create(
      {
        model,
        max_tokens: 1024,
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "tool", name: TOOL_NAME },
        messages: [
          { role: "user", content: opts.systemPrompt },
          { role: "assistant", content: first.content },
          {
            role: "user",
            content: `Your previous tool call failed schema validation: ${parsed.error}\nRetry the tool call with valid arguments. Do not output free text.`,
          },
        ],
      },
      { signal: AbortSignal.timeout(timeoutMs) },
    );

    const reparsed = parseToolUse(retry);
    if (reparsed.success) {
      return finalize(reparsed.value, model, start, sumUsage(first.usage, retry.usage));
    }
    return synthetic(model, `validation failed twice: ${reparsed.error}`);
  } catch (err) {
    return synthetic(model, `llm call failed: ${(err as Error).message}`);
  }
}

type ParseResult =
  | { success: true; value: SenseCheckDecision }
  | { success: false; error: string };

function parseToolUse(message: Anthropic.Messages.Message): ParseResult {
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === TOOL_NAME) {
      const result = SenseCheckDecisionSchema.safeParse(block.input);
      if (result.success) return { success: true, value: result.data };
      return { success: false, error: zodToString(result.error) };
    }
  }
  return { success: false, error: "no tool_use block in response" };
}

function zodToString(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ");
}

function finalize(
  decision: SenseCheckDecision,
  model: string,
  start: number,
  usage: Anthropic.Messages.Usage,
): LlmCallResult {
  return {
    decision,
    model,
    latencyMs: Date.now() - start,
    tokensIn: usage.input_tokens,
    tokensOut: usage.output_tokens,
    costUsd: estimateCost(model, usage.input_tokens, usage.output_tokens),
    synthesizedFallback: false,
  };
}

function sumUsage(
  a: Anthropic.Messages.Usage,
  b: Anthropic.Messages.Usage,
): Anthropic.Messages.Usage {
  return {
    ...a,
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
  };
}

function synthetic(model: string, reason: string): LlmCallResult {
  return {
    decision: {
      decision: "REQUIRE_APPROVAL",
      reasoning: `SenseCheck malfunction — defaulting to safety. (${reason})`,
      riskLevel: "MEDIUM",
      citedSources: [],
      confidence: 0.0,
    },
    model,
    latencyMs: 0,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    synthesizedFallback: true,
  };
}

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  if (model.includes("haiku")) {
    return (
      (tokensIn / 1_000_000) * HAIKU_INPUT_USD_PER_M +
      (tokensOut / 1_000_000) * HAIKU_OUTPUT_USD_PER_M
    );
  }
  return 0;
}
