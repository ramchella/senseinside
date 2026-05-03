# SenseInside

> **AI has intelligence. SenseInside gives it judgment before it acts.**

A local, open-source identity and governance layer for AI agents. Phase 1 ships on Anthropic's Claude Code via a subagent + `PreToolUse` hook, in **Observe Mode** — watch what your agent is doing and what a governor *would* have done, before turning on enforcement.

[**senseinside.ai**](https://senseinside.ai) · [Concept](docs/concept.md) · [Install](docs/install.md) · [Architecture](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [FAQ](docs/faq.md) · [**Zero-to-Hero Onboarding**](docs/onboarding.md)

## Install

```bash
npx @senseinside/cli init
```

You'll be asked for an Anthropic API key (used only for SenseCheck evaluation; never written to disk by SenseInside) and a starter identity archetype. The installer then scaffolds your local vault, registers the Claude Code hook, runs a smoke check, and prints what it cost.

## What it does

Before your AI agent edits a file, runs a command, sends a message, or browses the web, SenseInside runs a **SenseCheck** — an LLM-powered evaluation against a private, user-owned identity vault on your machine. The output is one of five decisions:

- `ALLOW` — fits identity and rules.
- `ALLOW_WITH_WARNING` — fine but worth noting.
- `REWRITE_ACTION` — mostly right, needs adjustment.
- `REQUIRE_APPROVAL` — risky enough that the user should approve.
- `BLOCK` — violates identity or rules.

In Phase 1a Observe Mode, every decision is logged. Nothing is blocked. After a week, run:

```bash
sense-inside report
```

…to see a digest grouped by decision, risk, and tool, with cost and latency.

## Why this exists

AI agents now have hands. They edit files, send emails, run commands, move money. They do not have an identity — no memory of who they serve, what was forbidden last week, or what tone you write in. Today's safety model is "external policing": sandboxes, allowlists, manual approvals. That model does not scale.

Humans do not solve this with more police. We carry memory + identity + values + self-awareness inside us, and consult them before acting. SenseInside builds the same internal layer for AI agents.

> *Capability without character is dangerous.*

## What you get

- A private vault under `~/.senseinside/private-brain/` — plain Markdown, plain English, all yours.
- A `PreToolUse` hook that fires on every Claude Code tool call.
- An LLM-powered SenseCheck evaluator (Claude Haiku 4.5 by default) using your own API key.
- An action log at `~/.senseinside/private-brain/logs/action-log.jsonl`.
- The five-archetype starter library (Founder available; four more shipping with the v0.2 release).

## Architecture

```
sense-inside/
├── packages/
│   ├── core/        pure library — schemas, prompt, brain reader, LLM client, cache
│   ├── hook/        Claude Code PreToolUse script (single-file ESM bundle)
│   └── cli/         npx sense-inside (init, report, doctor, mode, uninstall)
├── templates/       Founder archetype shipped by `init`
├── tests/           e2e Observe-mode tests
├── scripts/         release readiness check
└── docs/            project documentation
```

## Trust, not theatre

- **Identity stays local.** Zero servers. No telemetry by default. No identity content ever leaves your machine.
- **The hook never crashes.** Every error path logs and exits 0.
- **Tier-3 isolation.** Untrusted ingested content (web pages, emails, PDFs) cannot reach the SenseCheck prompt.
- **Honest framing.** SenseInside reduces the load on external policing. It does not replace sandboxing, audits, or human approval.

## Status

**Phase 1a — Observe Mode.** Production-ready, but watching only. Phase 1b adds Critical-only Intercept (~6 weeks). Phase 2 adds vendor-neutral MCP and a free cloud dashboard. The cloud product is a separate closed-source codebase; this repo stays open source forever.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The bar is *Movement is Clarity* — small, focused changes that make the install + observe + report loop tighter.

## License

[Apache 2.0](LICENSE).
