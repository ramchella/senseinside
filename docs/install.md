# Install

## Prerequisites

- Node.js 20+
- An Anthropic API key (`ANTHROPIC_API_KEY`)
- Anthropic's Claude Code installed

## One-line install

```bash
npx @senseinside/cli init
```

This will:

1. Create `~/.senseinside/private-brain/` with the trust-tiered folder layout.
2. Copy the **Founder** archetype identity files (you can customize them after).
3. Install the hook bundle to `~/.senseinside/bin/pretool.js`.
4. Write `~/.senseinside/config.json` with `mode: "observe"`.
5. Write the `sense-inside` subagent into `<your-project>/.claude/agents/sense-inside.md`.
6. Merge a `PreToolUse` hook entry into `<your-project>/.claude/settings.json`.
7. Run a smoke SenseCheck against the Anthropic API to verify everything works and print the cost.

The flow is **idempotent** — running it again does not duplicate hook entries or overwrite your identity files.

## What gets installed where

```
~/.senseinside/
├── private-brain/
│   ├── identity/       (Tier 0)
│   ├── governor/       (Tier 1)
│   ├── memory/         (Tier 2)
│   ├── feedback/       (Tier 2)
│   ├── logs/           action-log.jsonl
│   ├── inbox/          (Tier 3, untrusted)
│   └── research/       (Tier 3, untrusted)
├── bin/
│   └── pretool.js      hook bundle
└── config.json         mode + model + prompt version

<project>/
├── .claude/
│   ├── agents/sense-inside.md    subagent
│   └── settings.json             merged PreToolUse hook
└── .senseinside/
    └── private-brain/            project-level identity overrides
```

## Verifying

```bash
sense-inside doctor
```

Should report 7 checks passed, including hook bundle present, vault present, config readable, prompt version aligned, API key set, and Claude settings registered.

## Watching what your agent does

Trigger any Claude Code tool call (run a Bash command, edit a file, browse). Then:

```bash
sense-inside report
```

Prints a digest grouped by decision, risk, and tool, with cost and latency totals.

## Uninstalling

```bash
sense-inside uninstall
```

Removes only the hook entry from `.claude/settings.json`. Your identity vault is preserved (it is yours). To wipe everything, `rm -rf ~/.senseinside`.
