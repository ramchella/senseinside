# Contributing to SenseInside

Thanks for your interest. SenseInside is small, opinionated, and moves fast. The bar for contributions is "movement is clarity": small, focused changes that make the install + observe + report loop tighter.

## What we want

- **New identity archetypes** under `templates/archetypes/<name>/` — pull-request-only.
- **SenseCheck prompt improvements** that pass the eval at `packages/core/src/sensecheck/eval/run.ts` (9/10 cases minimum).
- **New eval cases** that catch real-world misclassifications.
- **Bug fixes** with a regression test.
- **Documentation** corrections and walkthroughs.

## What we do not want yet

- New tools or commands beyond `init`, `report`, `doctor`, `mode`, `uninstall`. Phase 1 is locked.
- Cloud sync, hosted inference, web UI, mobile — these are separate projects (SenseInside Cloud, closed source).
- Vendor neutrality (MCP, Cursor, VS Code) is **Phase 2**. Please don't open PRs for it yet.

## Local setup

```bash
git clone https://github.com/your-org/sense-inside.git
cd sense-inside
npm install
npm run build
npm run test
npm run eval        # requires ANTHROPIC_API_KEY
```

## Eval gate

Any change to `packages/core/src/sensecheck/prompt.ts` triggers `eval` in CI. The prompt is the product. Regressions block the merge.

## Commit messages

Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`. Keep PRs single-purpose.

## License

Apache 2.0. By contributing you agree your work is licensed under the same.
