import { createHash } from "node:crypto";
import { LRUCache } from "lru-cache";
import type { SenseCheckDecision, SenseCheckMode } from "./schema.js";

export interface CachedDecision {
  decision: SenseCheckDecision;
  storedAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 500;
const CONFIDENCE_FLOOR_FOR_CACHING = 0.8;

const lru = new LRUCache<string, CachedDecision>({
  max: MAX_ENTRIES,
  ttl: TTL_MS,
});

export interface CacheKeyParts {
  actionSignature: string;
  brainContextHash: string;
  mode: SenseCheckMode;
  promptVersion: string;
}

export function buildCacheKey(parts: CacheKeyParts): string {
  return createHash("sha256")
    .update(
      `${parts.actionSignature}|${parts.brainContextHash}|${parts.mode}|${parts.promptVersion}`,
    )
    .digest("hex");
}

export function getCached(key: string): SenseCheckDecision | undefined {
  const entry = lru.get(key);
  if (!entry) return undefined;
  if (entry.decision.confidence < CONFIDENCE_FLOOR_FOR_CACHING) return undefined;
  return entry.decision;
}

export function setCached(key: string, decision: SenseCheckDecision): void {
  if (decision.confidence < CONFIDENCE_FLOOR_FOR_CACHING) return;
  lru.set(key, { decision, storedAt: Date.now() });
}

export function clearCache(): void {
  lru.clear();
}
