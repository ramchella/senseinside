import { loadBrainContext } from "../privatebrain/index.js";
import { callSenseCheckLlm, type LlmCallResult } from "../llm/anthropic.js";
import { buildCacheKey, getCached, setCached } from "./cache.js";
import { buildSenseCheckPrompt, PROMPT_VERSION } from "./prompt.js";
import type {
  BrainContext,
  ProposedAction,
  SenseCheckDecision,
  SenseCheckMode,
} from "./schema.js";

export interface RunSenseCheckOptions {
  userVaultPath?: string;
  projectVaultPath?: string;
  apiKey?: string;
  model?: string;
  brainOverride?: { context: BrainContext; hash: string };
}

export interface SenseCheckResult {
  decision: SenseCheckDecision;
  promptVersion: string;
  model: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  cached: boolean;
  synthesizedFallback: boolean;
  brainContextHash: string;
}

const CONFIDENCE_OVERRIDE_THRESHOLD = 0.6;

export async function runSenseCheck(
  action: ProposedAction,
  mode: SenseCheckMode,
  options: RunSenseCheckOptions = {},
): Promise<SenseCheckResult> {
  const { context, hash } =
    options.brainOverride ??
    (await loadBrainContext({
      userVaultPath: options.userVaultPath,
      projectVaultPath: options.projectVaultPath,
    }));

  const cacheKey = buildCacheKey({
    actionSignature: action.actionSignature,
    brainContextHash: hash,
    mode,
    promptVersion: PROMPT_VERSION,
  });

  const cached = getCached(cacheKey);
  if (cached) {
    return {
      decision: applyConfidenceFloor(cached),
      promptVersion: PROMPT_VERSION,
      model: "cache",
      latencyMs: 0,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      cached: true,
      synthesizedFallback: false,
      brainContextHash: hash,
    };
  }

  const systemPrompt = buildSenseCheckPrompt(context, action, mode);
  const llm: LlmCallResult = await callSenseCheckLlm({
    apiKey: options.apiKey,
    model: options.model,
    systemPrompt,
  });

  const finalDecision = applyConfidenceFloor(llm.decision);
  if (!llm.synthesizedFallback) setCached(cacheKey, finalDecision);

  return {
    decision: finalDecision,
    promptVersion: PROMPT_VERSION,
    model: llm.model,
    latencyMs: llm.latencyMs,
    tokensIn: llm.tokensIn,
    tokensOut: llm.tokensOut,
    costUsd: llm.costUsd,
    cached: false,
    synthesizedFallback: llm.synthesizedFallback,
    brainContextHash: hash,
  };
}

function applyConfidenceFloor(decision: SenseCheckDecision): SenseCheckDecision {
  if (decision.confidence >= CONFIDENCE_OVERRIDE_THRESHOLD) return decision;
  if (decision.decision === "REQUIRE_APPROVAL" || decision.decision === "BLOCK") return decision;
  return {
    ...decision,
    decision: "REQUIRE_APPROVAL",
    reasoning: `${decision.reasoning} [Confidence ${decision.confidence.toFixed(2)} below threshold; elevated to REQUIRE_APPROVAL.]`,
  };
}
