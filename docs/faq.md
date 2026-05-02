# FAQ

## What is SenseInside in one sentence?

A small piece of software that watches what your AI agent is doing on your computer and decides whether the action fits who you are — using a private identity vault you own, in plain Markdown.

## Does it block actions?

In Phase 1a (the current public release): **no**. It runs in Observe Mode. Decisions are logged to `~/.senseinside/private-brain/logs/action-log.jsonl` but never enforced. Phase 1b will introduce Critical-only Intercept that blocks irreversible actions.

## Where does my data go?

Nowhere. SenseInside has no servers. Every identity file, every memory entry, every action-log line lives on your machine. The only network call is to your chosen LLM provider (Anthropic by default), using your own API key, to evaluate the proposed action.

## What does it cost in tokens?

Default model is Claude Haiku 4.5. Most SenseChecks are 1–3k input tokens and 200–500 output tokens. With caching, expect a few dollars per month for heavy daily use. `sense-inside report` shows your running cost.

## Why did you build this on Claude Code first instead of MCP?

Claude Code's `PreToolUse` hook is *mandatory* — the host blocks the tool call until the hook returns. MCP tools are *advisory* — the host can ignore them. Real enforcement on day one beats vendor neutrality on day one. MCP comes in Phase 2.

## Can I use a different LLM?

Phase 1a ships with Anthropic only. OpenAI, Gemini, and local Ollama support is on the Phase 1b list. You can already swap models via `SENSEINSIDE_MODEL` if Anthropic ships a new one before we update defaults.

## What if the LLM is down?

`runSenseCheck` returns a synthetic `REQUIRE_APPROVAL` decision with the reason logged. The hook always exits 0 in Phase 1a. Your agent keeps working; the log records that SenseCheck was unavailable.

## How is this different from prompt injection defenses, guardrails libraries, or Constitutional AI?

- **Constitutional AI** is training-time and applies model-wide. SenseInside is runtime, per-user, per-agent.
- **Guardrails libraries** (NeMo, Lakera, Invariant) are rule-based and embedded in the application. SenseInside uses LLM-powered judgment against a user-owned identity, runs at the host hook layer, and is portable across hosts.
- **Prompt injection defenses** focus on input filtering. SenseInside filters at the action layer (does this action fit who I am?), with a typed Tier-3 isolation for ingested content.

## Can I trust SenseInside to stop a malicious agent?

No, and we will not claim it does. Phase 1a is observability. Phase 1b adds enforcement on a narrow critical-action set. Even at full enforcement, an internal identity governor *reduces* the load on external policing — it does not replace sandboxing, audits, or human approval. We are honest about what SenseInside is and is not.

## How do I customize my identity?

Edit any file under `~/.senseinside/private-brain/identity/` or `~/.senseinside/private-brain/governor/`. SenseInside picks up changes automatically (mtime-based cache invalidation). Project-specific overrides go in `<your-project>/.senseinside/private-brain/`.

## Will there be a paid version?

Phase 1 is free and open source. A future *SenseInside Cloud* product (separate closed-source repo) will offer optional team and enterprise features: shared org-level governor rules, fleet observability dashboards, mobile approval inboxes, audit exports. The local CLI remains free forever.

## License

Apache 2.0.
