import type { ActionLogEntry, DecisionKind } from "@senseinside/core/schema";
import { runSenseCheck } from "@senseinside/core";
import { loadHookConfig } from "./config.js";
import { appendActionLog, appendErrorLog } from "./log.js";
import { parsePayload, readStdin, toProposedAction } from "./payload.js";

const PHASE_1A_OBSERVE_EXIT = 0;

async function main(): Promise<void> {
  const startTimestamp = new Date().toISOString();

  let raw = "";
  try {
    raw = await readStdin();
  } catch (err) {
    await appendErrorLog({
      timestamp: startTimestamp,
      stage: "stdin",
      message: (err as Error).message,
    });
    process.exit(PHASE_1A_OBSERVE_EXIT);
  }

  if (!raw.trim()) {
    await appendErrorLog({
      timestamp: startTimestamp,
      stage: "stdin",
      message: "empty payload",
    });
    process.exit(PHASE_1A_OBSERVE_EXIT);
  }

  let payload: ReturnType<typeof parsePayload>;
  try {
    payload = parsePayload(raw);
  } catch (err) {
    await appendErrorLog({
      timestamp: startTimestamp,
      stage: "parse",
      message: (err as Error).message,
      detail: raw.slice(0, 500),
    });
    process.exit(PHASE_1A_OBSERVE_EXIT);
  }

  const config = await loadHookConfig();
  if (!config.enabled) process.exit(PHASE_1A_OBSERVE_EXIT);

  let action: ReturnType<typeof toProposedAction>;
  try {
    action = toProposedAction(payload);
  } catch (err) {
    await appendErrorLog({
      timestamp: startTimestamp,
      stage: "action-build",
      message: (err as Error).message,
    });
    process.exit(PHASE_1A_OBSERVE_EXIT);
  }

  try {
    const result = await runSenseCheck(action, config.mode);

    const entry: ActionLogEntry = {
      timestamp: startTimestamp,
      sessionId: action.sessionId,
      actionSignature: action.actionSignature,
      toolName: action.toolName,
      decision: result.decision.decision,
      reasoning: result.decision.reasoning,
      citedSources: result.decision.citedSources,
      identityConflict: result.decision.identityConflict,
      confidence: result.decision.confidence,
      riskLevel: result.decision.riskLevel,
      model: result.model,
      promptVersion: result.promptVersion,
      latencyMs: result.latencyMs,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costUsd: result.costUsd,
      mode: config.mode,
      outcome: outcomeForObservePhase(result.decision.decision),
    };

    await appendActionLog(entry);
  } catch (err) {
    await appendErrorLog({
      timestamp: startTimestamp,
      stage: "sensecheck",
      message: (err as Error).message,
    });
  }

  // Phase 1a: Observe Mode is the entire shipped behavior. Always exit 0.
  // Phase 1b will branch on `result.decision.decision === "BLOCK"` and exit 2 in intercept-critical.
  process.exit(PHASE_1A_OBSERVE_EXIT);
}

function outcomeForObservePhase(_decision: DecisionKind): ActionLogEntry["outcome"] {
  return "logged_only";
}

main().catch(async (err) => {
  await appendErrorLog({
    timestamp: new Date().toISOString(),
    stage: "uncaught",
    message: (err as Error).message,
  });
  process.exit(PHASE_1A_OBSERVE_EXIT);
});
