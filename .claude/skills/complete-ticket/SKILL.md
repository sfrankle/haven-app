---
name: complete-ticket
description: Use when implementing a GitHub issue end-to-end — runs autonomously from ticket selection through PR creation. One human checkpoint: plan approval.
---

Read `.claude/skills/complete-ticket/escalation-policy.md` and `.claude/skills/complete-ticket/state-schema.md` before starting.

## State File

Check `docs/plans/ticket-in-progress.json`:
- **Missing:** start fresh
- **Present — valid** (branch exists via `git branch --list <branch>`, issue matches): resume from the `step` field
- **Present — stale** (branch gone or issue mismatch): delete it, start fresh

Write state to `docs/plans/ticket-in-progress.json` after every step. Write the JSON directly (no subagent). Use the schema in `state-schema.md`.

## Steps

Make a todo list of the following steps. Mark each in_progress when starting, completed when done, before moving to the next.

### 1. Determine next task
- If a `next_issue` is already populated in the state file (set by a prior wrap-up), use that issue number directly — skip `next-task`
- Otherwise, dispatch the `next-task` skill; it returns a ranked table of open technical tasks
  - If the result is ambiguous (multiple candidates, unclear priority) → escalate to Sarah
  - Record the **2nd** issue in the table (if one exists) as `next_issue` — we already have this, no extra call needed
- Fetch and cache the milestone:
  ```bash
  gh issue view <ISSUE_NUMBER> --json milestone --jq '.milestone.title'
  ```
- Write state: `step: "start"`, `issue: <number>`, `milestone: "<title>"`, `next_issue: <number or null>`

### 2. Plan
- Dispatch `haven-technical-planner` subagent with the issue number
- It writes the plan to `docs/plans/` and posts a summary comment on the issue
- Write state: `step: "planner-complete"`

### 3. Critique plan
- Dispatch `haven-plan-critic` subagent with: issue number, plan file path
- Parse the `VERDICT:` line from its output
- Apply `escalation-policy.md`:
  - `BLOCK` or `CONCERNS-SCOPE` → escalate to Sarah; do not continue until resolved
  - `CONCERNS-MINOR` → write the concern text to `plan_critic_concerns` in state; proceed
  - `PASS` → proceed
- Write state: `step: "plan-critic-complete"`, `critic_findings.plan: <verdict>`

### 4. Human checkpoint — plan approval
- Show Sarah: the plan file path, the issue comment link, and any `plan_critic_concerns`
- Wait for explicit approval
- If an escalation in step 3 was already resolved by Sarah, that resolution counts as approval — no second prompt needed
- Write state: `step: "human-approved-plan"`

### 5. Implement
- Dispatch `haven-implementer` subagent with: issue number, plan file path
- It checks out the branch, runs TDD, commits, and stops before PR creation
- Write state: `step: "implementer-complete"`, `branch: <branch name>`

### 6. Create PR
- Dispatch `haven-create-pr` subagent with: technical task issue number
- It creates the draft PR, writes the changelog row, commits, and pushes
- Capture the PR number from its output
- Mark the PR ready for review:
  ```bash
  gh pr ready <PR_NUMBER>
  ```
- Assign the milestone using the cached value from state (no GH lookup needed):
  ```bash
  gh pr edit <PR_NUMBER> --milestone "<state.milestone>"
  ```
- Write state: `step: "pr-created"`, `pr_number: <number>`

### 7. Simplify
- Invoke the `/simplify` skill on the changed code
- Post a PR comment summarising what simplify found and fixed:
  ```bash
  gh pr review <PR_NUMBER> --comment --body $'## Simplify Pass\n\n<summary of changes made>'
  ```
- Write state: `step: "simplify-complete"`

### 8. Critique implementation (parallel)
- Dispatch these three subagents as parallel Task calls (all at once):
  - `haven-conventions-critic` — pass: PR number, base SHA (`git rev-parse origin/main`), head SHA (`git rev-parse HEAD`), `plan_critic_concerns`
  - `haven-product-vision-critic` — pass: PR number, technical task issue number, `plan_critic_concerns` (it derives the user story number itself)
  - `haven-safety-critic` — pass: PR number, branch name
- Wait for all three to complete
- Write state: `step: "critics-complete"`, `critic_findings: { conventions, product_vision, safety }`

### 9. Synthesize findings
Apply `escalation-policy.md`:
- Any `BLOCK` → escalate to Sarah
- Any `CONCERNS` → apply fixes autonomously; re-run only the affected critic(s)
  - Re-run returns `PASS` → proceed
  - Re-run returns `CONCERNS` again → escalate to Sarah (no further autonomous loops)
- All `PASS` → proceed
- Any critic returned `null` (crash/timeout) → escalate to Sarah

### 10. Process review feedback
- Invoke `superpowers:receiving-code-review` to process any remaining feedback from the critic comments
- Write state: `step: "review-processed"`

### 11. Commit and push
- Commit any changes from steps 9–10
- Push to remote
- Write state: `step: "pushed"`

### 12. Wrap up
- Capture `state.next_issue` before invoking wrap-up (the file will be deleted)
- Invoke `/wrap-up-pr`
  - It runs `haven-pr-readiness`, checks the CI box, and deletes `docs/plans/ticket-in-progress.json`
- If `next_issue` was set, immediately write a fresh minimal state file:
  ```json
  { "next_issue": <NUMBER>, "step": "start" }
  ```
  Tell Sarah: "Next up: #N — <title>. Run /complete-ticket to start."
- If `next_issue` was null, tell Sarah the milestone is complete (or no queued task). Do not write a state file.

### 13. Stop
Hand to Sarah for merge. Do not merge.
