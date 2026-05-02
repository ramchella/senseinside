# Launch Readiness Checklist

Run before publishing v0.1 to npm.

## Code

- [ ] `npm install` clean from a fresh clone (no peer-dep warnings on Node 20).
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes for all three workspaces.
- [ ] `npm run build` produces:
  - [ ] `packages/core/dist/index.js`, `dist/sensecheck/schema.js` + `.d.ts` files.
  - [ ] `packages/hook/dist/pretool.js` (single-file ESM, has `#!/usr/bin/env node` shebang).
  - [ ] `packages/cli/dist/bin.js` (single-file ESM, has shebang) and `dist/templates/` populated.
- [ ] `npm run test` passes — unit tests + `tests/e2e-observe.test.ts`.
- [ ] `npm run eval` passes 9/10 of the 10 starter cases.
- [ ] `tsx scripts/release.ts` exits 0.

## Hook correctness

- [ ] Hook bundle on a known-bad payload (empty stdin, malformed JSON) exits 0 and writes to `~/.senseinside/logs/hook-errors.jsonl`.
- [ ] Hook bundle on a valid payload writes a `ActionLogEntrySchema`-shaped JSONL line.
- [ ] Hook command in `.claude/settings.json` does NOT use `npx`.
- [ ] Hook bundle cold start measured at < 200ms.

## Install correctness

- [ ] `npx @senseinside/cli init` is idempotent — running twice does not duplicate the hook entry, does not overwrite identity files, does not overwrite `config.json`.
- [ ] `init` runs the smoke SenseCheck and prints decision + confidence + latency + cost.
- [ ] `init` works without a key (warns and continues; synthetic decisions returned).
- [ ] `init` archetype copy preserves any pre-existing user files.
- [ ] `sense-inside doctor` prints all 7 checks; exits 1 if any fail.
- [ ] `sense-inside uninstall` removes only SenseInside's hook entry; leaves other hooks intact; preserves vault.

## Trust-tier defense

- [ ] A Markdown file placed in `~/.senseinside/private-brain/inbox/` is read by the brain reader but **not** present in `BrainContext.identity`, `.governor`, `.memory`, or `.feedback`.
- [ ] A Markdown file with a frontmatter `tier: 0` placed inside `/inbox/` is treated as Tier 3 (folder beats frontmatter on disagreement).

## Observability

- [ ] Action log JSONL lines round-trip through `ActionLogEntrySchema.parse` without validation errors.
- [ ] `sense-inside report` displays the most recent non-ALLOW decisions with cited sources.
- [ ] Cost totals match Anthropic API console within rounding error.

## Docs

- [ ] README has the install one-liner, the five decision types, the trust-stance section, and the Phase 1 status.
- [ ] [Concept](concept.md), [Install](install.md), [Architecture](architecture.md), [Roadmap](roadmap.md), [FAQ](faq.md) are all linked from README.
- [ ] [SECURITY.md](../SECURITY.md), [CONTRIBUTING.md](../CONTRIBUTING.md), [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md), [LICENSE](../LICENSE) present at repo root.

## Repo hygiene

- [ ] `.github/workflows/ci.yml` — typecheck + lint + build + test on every push and PR.
- [ ] `.github/workflows/eval.yml` — runs `npm run eval` on PRs that touch the prompt or eval cases (gated by `ANTHROPIC_API_KEY` secret).
- [ ] `.changeset/` configured with `fixed: [["@senseinside/core", "@senseinside/hook", "@senseinside/cli"]]`.
- [ ] `.gitignore` excludes `node_modules`, `dist`, `.env`, `~/.senseinside/`.

## Publishing

- [ ] Reserve `@senseinside` npm scope (`npm org create senseinside`).
- [ ] First publish each package with `--access public`.
- [ ] Tag `v0.1.0` in git, write release notes referencing this checklist.
- [ ] Verify `npx @senseinside/cli init` works from a freshly published registry.

## Marketing

- [ ] senseinside.ai landing page live with install command, demo video, GitHub link.
- [ ] Show HN post drafted (link this repo + landing page).
- [ ] X / LinkedIn launch threads pre-written.
- [ ] Five friendly newsletter / podcast contacts briefed.

When every box above is checked, ship.
