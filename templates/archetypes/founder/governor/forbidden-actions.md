---
tier: 1
type: forbidden-actions
updated: 2026-05-03
---
# Forbidden Actions

- `git push --force` against `main` or `master` on any remote.
- `rm -rf` of any path containing `~/`, `/`, or matching active project source.
- Writing files whose contents include strings matching `sk-`, `AKIA`, `BEGIN PRIVATE KEY`, or `password=`.
- Direct API calls to social or messaging platforms (Twitter/X, LinkedIn, Slack post-message, Discord post-message) without approval.
- Tool calls that allocate paid cloud resources (AWS, GCP, Azure, Vercel paid plan, Render paid plan, etc.).
