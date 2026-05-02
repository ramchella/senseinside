# Architecture

## Three packages

| Package | Role |
|---|---|
| `@senseinside/core` | Pure library. Schemas, prompt, brain reader, LLM client, cache, orchestrator. Knows nothing about Claude Code. |
| `@senseinside/hook` | Single-file ESM bundle invoked by Claude Code's `PreToolUse` hook. Reads stdin, calls `core.runSenseCheck`, writes JSONL log, exits 0. |
| `@senseinside/cli` | `npx sense-inside` user tool. `init`, `report`, `doctor`, `mode`, `uninstall`. |

```
Claude Code
   │
   ├── PreToolUse fires  ──→  ~/.senseinside/bin/pretool.js  (hook bundle)
   │                              │
   │                              ├── parses stdin payload
   │                              ├── loads ~/.senseinside/config.json
   │                              └── calls @senseinside/core.runSenseCheck
   │                                      │
   │                                      ├── loads BrainContext from
   │                                      │   ~/.senseinside/private-brain/      (user)
   │                                      │   <cwd>/.senseinside/private-brain/  (project — overrides)
   │                                      │
   │                                      ├── filters out Tier 3 (/inbox, /research)
   │                                      │
   │                                      ├── builds SenseCheck prompt v1.0.0
   │                                      │
   │                                      ├── calls Anthropic messages.create
   │                                      │   with forced tool use
   │                                      │   (record_sensecheck_decision)
   │                                      │
   │                                      ├── Zod-validates the tool input
   │                                      │   (retry once on failure;
   │                                      │    synthetic REQUIRE_APPROVAL on second failure)
   │                                      │
   │                                      ├── caches successful decisions
   │                                      │   (LRU, 5-min TTL,
   │                                      │    skip when confidence < 0.8)
   │                                      │
   │                                      └── applies confidence floor
   │                                          (confidence < 0.6 → REQUIRE_APPROVAL)
   │
   └── (Phase 1a) hook always exits 0; Claude proceeds with the action
```

## Why the layers exist

- **`core` is reusable.** Phase 2 wraps the same `core` in an MCP server and IDE extensions. Phase 3 wraps it in a cloud agent. The library never changes.
- **`hook` is platform-specific.** It speaks Claude Code's `PreToolUse` payload format. Future hosts get their own thin adapter packages.
- **`cli` is the user surface.** It scaffolds, configures, diagnoses, reports — everything a human does between sessions.

## Trust tiers, in code

`BrainContextSchema` accepts only `T0 | T1 | T2` sections. The brain reader filters `T3` content before it ever reaches the schema. Any code path that tries to inject T3 content into the context fails type-check. This is the prompt-injection defense.

## Failure modes

| Stage | Failure | Phase 1a behavior |
|---|---|---|
| stdin | unreadable | log to error log, exit 0 |
| stdin | empty | log, exit 0 |
| payload | malformed JSON | log, exit 0 |
| config | missing or malformed | use defaults (`observe`), continue |
| brain reader | missing folder | empty arrays for that tier |
| brain reader | malformed frontmatter | skip section, log warning |
| LLM | API down or timeout | synthetic `REQUIRE_APPROVAL`, log, exit 0 |
| LLM | invalid key | synthetic `REQUIRE_APPROVAL`, log, exit 0 |
| LLM | Zod validation fails twice | synthetic `REQUIRE_APPROVAL`, log, exit 0 |
| any | uncaught exception | top-level handler, log, exit 0 |

The hook never crashes. The action is logged or it is not, but the user's terminal is never broken by SenseInside.

## Cost model

Default model: `claude-haiku-4-5`. Typical SenseCheck = 1k–3k input tokens, 200–500 output. With caching (LRU + 5-min TTL, skip on confidence < 0.8), expect a few dollars per heavy day for an active developer. `sense-inside report` shows running totals.

## Performance targets

- Hook cold start: < 200ms (single-file bundle, no `npx`).
- SenseCheck round-trip on Haiku 4.5: 600–1500ms.
- Cache hit: < 5ms.
- Brain reader on cold cache: < 50ms for vaults under 50 files.
