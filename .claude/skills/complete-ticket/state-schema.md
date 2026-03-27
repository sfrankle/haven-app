# Ticket State Schema

The orchestrator writes `docs/plans/ticket-in-progress.json` after every step. This file is gitignored (`docs/plan/` is in `.gitignore`).

## Shape

```json
{
  "issue": 123,
  "branch": "feat/some-feature",
  "pr_number": null,
  "step": "planner-complete",
  "critic_findings": {
    "plan": "PASS",
    "code_quality": null,
    "product_vision": null,
    "safety": null
  },
  "plan_critic_concerns": "",
  "started_at": "2026-03-25T10:00:00Z",
  "updated_at": "2026-03-25T11:30:00Z"
}
```

## Valid Step Values (in order)

| Step value | Meaning |
|---|---|
| `start` | Just started or resumed |
| `planner-complete` | haven-technical-planner ran; plan file exists |
| `plan-critic-complete` | haven-plan-critic ran; verdict in critic_findings.plan |
| `human-approved-plan` | Sarah approved the plan |
| `implementer-complete` | haven-implementer ran; commits pushed |
| `pr-created` | haven-create-pr ran; pr_number populated |
| `simplify-complete` | /simplify ran; PR comment posted |
| `critics-complete` | All three post-implementation critics ran |
| `review-processed` | superpowers:receiving-code-review ran |
| `pushed` | Changes committed and pushed |
| `wrap-up-complete` | /wrap-up-pr ran; state file about to be deleted |

## Staleness Check

On startup, the state file is considered stale if either:
1. `git branch --list <branch>` returns empty (branch no longer exists)
2. The orchestrator is given an issue number that doesn't match `state.issue`

Stale state → discard file, start fresh.

## critic_findings values

Each critic field holds: `null` (not yet run), `"PASS"`, `"CONCERNS"`, or `"BLOCK"`.

The `plan` field may also hold `"CONCERNS-MINOR"` or `"CONCERNS-SCOPE"` to distinguish escalation behaviour.

## plan_critic_concerns

Free-text field. If the plan critic returned `CONCERNS-MINOR`, the orchestrator writes the concern summary here. This string is passed to post-implementation critics as additional context so they know what to watch for.
