# Ticket State Schema

The orchestrator writes `docs/plans/ticket-in-progress.json` after every step. This file is gitignored (`docs/plan/` is in `.gitignore`).

## Shape

```json
{
  "issue": 123,
  "milestone": "Milestone 2 — Core Logging",
  "branch": "feat/some-feature",
  "pr_number": null,
  "next_issue": null,
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

## Fields

| Field | When set | Purpose |
|---|---|---|
| `issue` | Step 1 | The GitHub issue number being worked |
| `milestone` | Step 1 | Cached milestone title — avoids re-fetching later |
| `branch` | Step 5 | Feature branch name |
| `pr_number` | Step 6 | PR number once created |
| `next_issue` | Step 13 (wrap-up) | Pre-populated issue number for the next ticket |
| `step` | Every step | Resume point |
| `critic_findings` | Steps 3, 8 | Critic verdicts |
| `plan_critic_concerns` | Step 3 | Free-text concerns forwarded to post-impl critics |
| `started_at` | Step 1 | ISO timestamp when ticket work started |
| `updated_at` | Every step | ISO timestamp of last write |
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

## Freshness Check

If the state file exists and is valid but `updated_at` is more than 20 minutes ago, re-fetch the issue's current GH state before resuming (labels, milestone, open/closed). This guards against state that was written in a prior session and may be stale. The freshness check is informational — it does not discard the file, just refreshes the cached fields (`milestone`).

## critic_findings values

Each critic field holds: `null` (not yet run), `"PASS"`, `"CONCERNS"`, or `"BLOCK"`.

The `plan` field may also hold `"CONCERNS-MINOR"` or `"CONCERNS-SCOPE"` to distinguish escalation behaviour.

## plan_critic_concerns

Free-text field. If the plan critic returned `CONCERNS-MINOR`, the orchestrator writes the concern summary here. This string is passed to post-implementation critics as additional context so they know what to watch for.
