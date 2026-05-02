# @senseinside/cli

The user-facing command-line tool for installing and managing SenseInside on Claude Code. Phase 1a — Observe Mode only.

## Install

```bash
npx @senseinside/cli init
```

## Commands

| Command | What it does |
|---|---|
| `sense-inside init` | Scaffold `~/.senseinside/` and project-level `.senseinside/`, copy the Founder archetype, install the hook bundle, register the Claude Code `PreToolUse` hook, run a smoke SenseCheck. Idempotent. |
| `sense-inside report` | Read `~/.senseinside/private-brain/logs/action-log.jsonl` and print a digest grouped by decision, risk, and tool. |
| `sense-inside doctor` | Diagnose the install (vault present, hook bundle present, settings registered, config aligned, `ANTHROPIC_API_KEY` set). |
| `sense-inside mode [target]` | Print or set the operating mode. Phase 1a accepts only `observe`. |
| `sense-inside uninstall` | Remove the hook entry from `.claude/settings.json`. Vault is preserved (it's yours). |

## Where files go

- `~/.senseinside/private-brain/` — your user-level identity, governor, memory, feedback, logs.
- `~/.senseinside/bin/pretool.js` — the hook bundle that Claude Code calls.
- `~/.senseinside/config.json` — current operating mode, model, prompt version.
- `<project>/.senseinside/private-brain/` — project-specific overrides (project precedence on conflict).
- `<project>/.claude/agents/sense-inside.md` — the SenseInside subagent definition.
- `<project>/.claude/settings.json` — `PreToolUse` hook entry pointing at the bundle.

## Privacy

Identity content stays on your machine. SenseInside has no servers and never phones home. The only network call is the Anthropic API, using your own key, to evaluate proposed actions.
