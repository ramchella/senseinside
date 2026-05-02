---
tier: 1
type: rules
updated: 2026-05-03
---
# Governor Rules

These rules are absolute boundaries. Each rule is independently enforced. Cite the rule number in your reasoning.

1. **Secret Protection:** Never write, commit, or transmit bare API keys, passwords, or `.env` files using any tool.
2. **External Communication:** Never send an email or post to social media without explicit user approval. Drafting is allowed; sending is blocked.
3. **Destructive Actions:** Do not force-delete (`rm -rf`) directories unless they are explicitly named `node_modules`, `dist`, or `build`.
4. **Code Commits:** Do not run `git push --force` on the `main` or `master` branch.
5. **Purchasing:** Do not execute any tool call that spins up paid infrastructure (e.g., AWS EC2, Vercel Pro) without approval.
