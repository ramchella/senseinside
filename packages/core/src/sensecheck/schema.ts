import { z } from "zod";

export const SenseCheckMode = z.enum([
  "observe",
  "intercept-critical",
  "intercept-balanced",
  "intercept-strict",
]);
export type SenseCheckMode = z.infer<typeof SenseCheckMode>;

export const ProposedActionSchema = z.object({
  toolName: z.string().min(1),
  toolInput: z.record(z.unknown()),
  sessionId: z.string().optional(),
  transcriptPath: z.string().optional(),
  cwd: z.string().optional(),
  hookEventName: z.literal("PreToolUse"),
  actionSignature: z.string().min(1),
  timestamp: z.string().datetime(),
});
export type ProposedAction = z.infer<typeof ProposedActionSchema>;

export const TrustTier = z.enum(["T0", "T1", "T2", "T3"]);
export type TrustTier = z.infer<typeof TrustTier>;

export const BrainSectionSchema = z.object({
  path: z.string().min(1),
  trustTier: TrustTier,
  content: z.string(),
  lastModified: z.string().datetime(),
});
export type BrainSection = z.infer<typeof BrainSectionSchema>;

const TrustedSectionSchema = BrainSectionSchema.extend({
  trustTier: z.enum(["T0", "T1", "T2"]),
});

export const BrainContextSchema = z.object({
  identity: z.array(TrustedSectionSchema),
  governor: z.array(TrustedSectionSchema),
  memory: z.array(TrustedSectionSchema),
  feedback: z.array(TrustedSectionSchema),
});
export type BrainContext = z.infer<typeof BrainContextSchema>;

export const DecisionKind = z.enum([
  "ALLOW",
  "ALLOW_WITH_WARNING",
  "REWRITE_ACTION",
  "REQUIRE_APPROVAL",
  "BLOCK",
]);
export type DecisionKind = z.infer<typeof DecisionKind>;

export const RiskLevel = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const SenseCheckDecisionSchema = z.object({
  decision: DecisionKind,
  reasoning: z.string().min(1),
  suggestedRewrite: z.string().optional(),
  riskLevel: RiskLevel,
  citedSources: z.array(z.string()),
  identityConflict: z.string().optional(),
  confidence: z.number().min(0).max(1),
});
export type SenseCheckDecision = z.infer<typeof SenseCheckDecisionSchema>;

export const ActionLogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  sessionId: z.string().optional(),
  actionSignature: z.string(),
  toolName: z.string(),
  decision: DecisionKind,
  reasoning: z.string(),
  citedSources: z.array(z.string()),
  identityConflict: z.string().optional(),
  confidence: z.number(),
  riskLevel: RiskLevel,
  model: z.string(),
  promptVersion: z.string(),
  latencyMs: z.number(),
  tokensIn: z.number(),
  tokensOut: z.number(),
  costUsd: z.number(),
  mode: SenseCheckMode,
  outcome: z.enum(["logged_only", "allowed", "blocked", "rewritten", "approval_pending"]),
});
export type ActionLogEntry = z.infer<typeof ActionLogEntrySchema>;
