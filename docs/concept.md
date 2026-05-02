# Concept

> AI has intelligence. SenseInside gives it judgment before it acts.

SenseInside is a runtime identity-governance and behavioral-observability layer for AI agents. It runs locally on your machine, reads a private vault of Markdown identity files you own, and evaluates every proposed agent action against that identity before the action happens.

## Why now

AI agents are gaining the ability to take real actions — edit files, send emails, run commands, browse the web. Today's safety model is "external policing": sandboxes, allowlists, manual approvals. That model does not scale.

Humans solved this problem with internal regulation. Every healthy adult carries memory + identity + values + self-awareness, and consults this internal layer before acting. SenseInside builds the same layer for AI agents.

## What it is not

- **Not a notes app.** PrivateBrain is structured identity, not free-form notes.
- **Not an agent framework.** It governs Claude Code; it does not build new agents.
- **Not a model marketplace.** Bring your own LLM key.
- **Not a cloud SaaS in Phase 1.** Local-first, open source, zero infrastructure.

## How it works in one paragraph

When your AI agent (currently Claude Code) is about to call a tool, a `PreToolUse` hook fires. SenseInside reads the proposed action, loads your local identity files (`/identity`, `/governor`, `/memory`, `/feedback`), sends them along with the action to a SenseCheck LLM evaluator (Claude Haiku 4.5 by default), and gets back one of five decisions: ALLOW, ALLOW_WITH_WARNING, REWRITE_ACTION, REQUIRE_APPROVAL, BLOCK. In Phase 1a Observe Mode, the decision is logged but not enforced — you see what a governor *would* have done.

## Trust tiers

| Tier | Folder | What it holds | Mutability |
|---|---|---|---|
| T0 | `/identity` | Who the user is — values, tone, boundaries, risk profile | Signed root, rarely changes |
| T1 | `/governor` | Explicit rules — forbidden actions, approval policies | Append-only |
| T2 | `/memory`, `/feedback` | Facts, preferences, prior corrections | Versioned writes |
| T3 | `/inbox`, `/research` | Untrusted ingested content (web, email, PDFs) | **Cannot influence governor decisions** |

Tier 3 isolation is the prompt-injection defense. Even if a malicious web page lands in `/inbox`, it cannot reach the SenseCheck prompt.

## The five decisions

- **ALLOW** — fits identity and rules. Proceed silently.
- **ALLOW_WITH_WARNING** — fine but worth noting (Phase 1a logs only).
- **REWRITE_ACTION** — mostly right, needs adjustment.
- **REQUIRE_APPROVAL** — risky enough that the user should approve.
- **BLOCK** — violates identity or rules. Refuse.

In Phase 1a, all decisions are logged. In Phase 1b (Critical-only Intercept), only `BLOCK` decisions actually halt the action.
