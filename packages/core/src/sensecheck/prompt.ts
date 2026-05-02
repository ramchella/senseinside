import type { BrainContext, BrainSection, ProposedAction, SenseCheckMode } from "./schema.js";

export const PROMPT_VERSION = "1.0.0";

export function buildSenseCheckPrompt(
  context: BrainContext,
  action: ProposedAction,
  mode: SenseCheckMode,
): string {
  return [
    "You are SenseInside, the internal identity and governance layer for an AI agent.",
    "",
    "Your job is NOT to execute the user's task. Your job is to evaluate a proposed action BEFORE the agent executes it, against the user's identity, operational rules, and memory.",
    "",
    `You operate in mode: ${mode.toUpperCase()}.`,
    modeGuidance(mode),
    "",
    divider("PROPOSED ACTION"),
    `TOOL: ${action.toolName}`,
    "INPUT:",
    JSON.stringify(action.toolInput, null, 2),
    `WORKING DIRECTORY: ${action.cwd ?? "unknown"}`,
    `SESSION: ${action.sessionId ?? "unknown"}`,
    "",
    divider("TIER 0 — CORE IDENTITY (signed root, highest priority)"),
    renderSections(context.identity, "No identity files configured."),
    "",
    divider("TIER 1 — GOVERNOR RULES (strict execution boundaries)"),
    renderSections(context.governor, "No governor rules configured."),
    "",
    divider("TIER 2 — MEMORY & FEEDBACK (contextual adjustments)"),
    renderSections(
      [...context.memory, ...context.feedback],
      "No relevant memory or prior feedback.",
    ),
    "",
    divider("EVALUATION PROTOCOL"),
    "1. Does the action violate a Tier 1 Governor Rule? -> BLOCK (or REQUIRE_APPROVAL if the rule allows override).",
    "2. Does it contradict Tier 0 Core Identity (tone, boundaries, risk profile)? -> REWRITE_ACTION or BLOCK.",
    "3. Touches sensitive surface (money, external communication, secrets, production)? -> REQUIRE_APPROVAL or ALLOW_WITH_WARNING.",
    "4. Aligns cleanly with identity and rules? -> ALLOW.",
    "",
    "Tier ordering: Tier 0 is the signed root identity (who the user is). Tier 1 is the explicit boundary set the user has written to enforce that identity. They cooperate, not compete — Tier 1 overrides ambiguity in Tier 0.",
    "",
    "When citing sources, list the file paths from the brain that drove your decision (e.g., '/governor/rules.md').",
    "",
    "If your confidence is below 60%, prefer REQUIRE_APPROVAL over ALLOW. It is always safer to ask than to assume.",
    "",
    divider("OUTPUT"),
    "Respond by calling the record_sensecheck_decision tool with valid arguments. Do not output free text.",
  ].join("\n");
}

function modeGuidance(mode: SenseCheckMode): string {
  switch (mode) {
    case "observe":
      return "You are in OBSERVE mode. Decisions will be logged but not enforced. Be candid and aggressive in flagging — over-flagging here costs nothing and trains the user's identity.";
    case "intercept-critical":
      return "You are in INTERCEPT-CRITICAL mode. Only your BLOCK decisions will halt the action. Reserve BLOCK for irreversible or catastrophic actions (data loss, public exposure, money movement, secret leak). Use REQUIRE_APPROVAL for high-risk reversible actions.";
    case "intercept-balanced":
      return "You are in INTERCEPT-BALANCED mode. All non-ALLOW decisions are enforced. Apply judgment proportionate to risk.";
    case "intercept-strict":
      return "You are in INTERCEPT-STRICT mode. The user has opted into high friction. Default toward REQUIRE_APPROVAL on anything ambiguous; reserve ALLOW for clearly-safe routine actions.";
  }
}

function renderSections(sections: BrainSection[], emptyMessage: string): string {
  if (sections.length === 0) return emptyMessage;
  return sections
    .map(
      (s) =>
        `--- ${s.path} (tier ${s.trustTier}, updated ${s.lastModified}) ---\n${s.content.trim()}`,
    )
    .join("\n\n");
}

function divider(title: string): string {
  return `═══════════════════════════════════════════════════════\n${title}\n═══════════════════════════════════════════════════════`;
}
