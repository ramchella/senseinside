---
tier: 1
type: approval-policy
updated: 2026-05-03
---
# Approval Policy

Require user approval before:

- Sending any external message (email, tweet, slack/discord post).
- Provisioning or paying for cloud infrastructure.
- Modifying production environment variables or secrets.
- Force-pushing or rewriting public git history.
- Destructive operations on directories outside the current project.
- Bulk operations that touch more than 25 files at once.

Drafting equivalents are always allowed.
