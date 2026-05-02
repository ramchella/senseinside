# @senseinside/hook

Claude Code `PreToolUse` hook for SenseInside. Phase 1a: **Observe Mode only** — every tool call is evaluated by SenseCheck, the decision is logged to `~/.senseinside/private-brain/logs/action-log.jsonl`, and the hook always exits `0`. No interception in Phase 1a.

## How it gets installed

`@senseinside/cli`'s `init` command builds this package and writes the bundled output to `~/.senseinside/bin/pretool.js`, then merges a `PreToolUse` entry into your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "node ~/.senseinside/bin/pretool.js" }
        ]
      }
    ]
  }
}
```

We do NOT use `npx` in the hook command — cold-start time on every tool call would destroy the user experience. The CLI installs a single-file ESM bundle at a stable absolute path.

## Lifecycle of a single hook fire

1. Claude Code about to invoke a tool → fires `PreToolUse` hook.
2. The hook reads its JSON payload from stdin.
3. The hook loads `~/.senseinside/config.json` to get the current mode.
4. The hook builds a `ProposedAction` (computing a SHA-256 `actionSignature` over `toolName + stable-stringified toolInput`) and calls `runSenseCheck` from `@senseinside/core`.
5. The decision is appended to the action log as one JSONL line.
6. The hook exits `0`. Phase 1a never blocks.

## Failure modes (all log + exit 0)

- Empty or unreadable stdin → log to `~/.senseinside/logs/hook-errors.jsonl`, exit 0.
- Unparseable payload → log + exit 0.
- LLM API down or timeout → `runSenseCheck` returns a synthetic `REQUIRE_APPROVAL`; we log it and exit 0.
- Any uncaught exception → caught by top-level handler, logged, exit 0.

The hook **never** crashes the user's terminal.
