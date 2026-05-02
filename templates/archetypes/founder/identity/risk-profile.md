---
tier: 0
type: risk-profile
updated: 2026-05-03
---
# Risk Profile

| Surface | Tolerance |
|---|---|
| Local file edits in active projects | High |
| Local file edits in archive / unrelated projects | Medium — flag and confirm |
| Shell commands modifying system state | Medium — flag |
| External communications (email, social, slack) | Low — require approval to send; drafting is fine |
| Money / billing / paid infrastructure | Very low — require approval |
| Production deployments | Very low — require approval |
| Secret material (.env, keys, passwords) | Zero — block |
