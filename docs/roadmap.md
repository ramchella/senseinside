# Roadmap

SenseInside ships in tightly scoped phases. The current public release is **Phase 1a — Observe Mode on Claude Code**.

## Phase 1 — Local CLI on Claude Code

### Phase 1a — Observe Mode (this release)

- Claude Code subagent + `PreToolUse` hook
- Local Markdown PrivateBrain with trust tiers
- LLM-powered SenseCheck via the user's own Anthropic key (Haiku 4.5 default)
- LRU cache, mtime-based brain invalidation, prompt-version tracking
- `init`, `report`, `doctor`, `mode`, `uninstall` commands
- Founder archetype shipped; four more archetypes stubbed

### Phase 1b — Versioning + Critical-only Intercept

- Git-based versioning of `/memory` writes
- `sense-inside undo` and `sense-inside history`
- Mode switcher unlocks `intercept-critical`
- Hook returns blocking exit code on `BLOCK` decisions for irreversible actions
- Approval flow at terminal

## Phase 2 — Vendor Neutrality + Cloud Free Tier

- SenseInside MCP server (Cursor, ChatGPT Desktop, Antigravity, OpenClaw)
- Cursor + VS Code extensions
- `npx sense-inside login` opens an optional Cloud Free account
- Personal web dashboard, mobile approval inbox, decision history
- **Identity files stay local** — cloud holds metadata only

## Phase 3 — SaaS Control Plane (Cloud, separate closed-source repo)

Three pillars: Fleet Observability, Centralized Identity Management, Approval Inbox.

## Phase 4 — Topology, hosted inference, self-hosted

Agent network topology graph, optional managed LLM judgment, on-prem deployment.

## What we will not build

- Agent orchestration framework (LangChain/AutoGen/CrewAI lane).
- Vector database / RAG layer.
- Prompt-engineering IDE.
- Model-quality evaluation tool (Arize/Galileo lane).
- Anything that requires identity content to leave the user's machine.
