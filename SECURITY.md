# Security Policy

SenseInside is security-adjacent software (it runs before AI-agent tool calls). We take vulnerability reports seriously.

## Reporting a vulnerability

Email **security@senseinside.ai** with:

- A clear description of the issue.
- Reproduction steps.
- Affected versions.
- Your suggested mitigation if you have one.

Please do not open a public GitHub issue for security reports.

We will acknowledge receipt within 72 hours and aim to ship a fix or coordinated disclosure within 14 days for critical issues.

## Architectural commitments relevant to security

- **Identity stays local.** SenseInside has no servers and never uploads identity, memory, or tool-input content.
- **Trust tiers are enforced at the type level.** `BrainContextSchema` rejects Tier 3 (`/inbox`, `/research`) sections at construction; the brain reader filters them before any LLM call.
- **The hook never crashes.** All error paths log and exit 0. A crashed hook does not break the user's terminal.
- **Tool inputs are not transmitted to anyone other than the user's chosen LLM provider** (Anthropic, by default), via the user's own API key.
- **The action log is local** (`~/.senseinside/private-brain/logs/action-log.jsonl`).

## Supported versions

The latest minor of `@senseinside/cli`, `@senseinside/core`, and `@senseinside/hook` receive security fixes. Older versions are best-effort.
