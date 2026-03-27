# Autonomous Ticket Workflow Design

**Date:** 2026-03-25
**Status:** Approved

## Goal

Enable Claude to work nearly fully autonomously from ticket selection through PR readiness — escalating to the human only when genuinely uncertain or when a critic returns a blocking finding. Multiple fresh Claude instances act as critics at key moments to verify the work independently.

---

## Architecture

### Orchestrator

`complete-ticket` is an in-context skill (not a subagent). Claude runs it, dispatches subagents at each step, reads their outputs, makes judgment calls, and escalates to Sarah when the escalation policy requires it.

All work and all critique is done by subagents — the orchestrator only reads, decides, and escalates.

### State File

`docs/plans/ticket-in-progress.json` (gitignored) — written after every step.

On start, `complete-ticket` checks for this file:
- Missing: start fresh
- Present but stale (branch no longer exists per `git branch --list <branch>` returning empty, or issue number doesn't match): discard and start fresh
- Valid: resume from last completed step

Deleted by `wrap-up-pr` as its final action.

### State Schema

```json
{
  "issue": 123,
  "branch": "feat/some-feature",
  "pr_number": null,
  "step": "haven-implementer-complete",
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

Valid `step` values (in order): `start`, `planner-complete`, `plan-critic-complete`, `human-approved-plan`, `implementer-complete`, `pr-created`, `simplify-complete`, `critics-complete`, `review-processed`, `pushed`, `wrap-up-complete`.

---

## Flow

```
START
  ↓
Check ticket-in-progress.json → resume or start fresh
  ↓
[next-task skill] → confirm issue with Sarah if ambiguous
  ↓                                                          STATE WRITTEN
[haven-technical-planner subagent] (opus)
  → writes plan to docs/plans/ (gitignored, ephemeral)
  → posts summary comment on issue
  ↓                                                          STATE WRITTEN
[haven-plan-critic subagent] (opus)
  → reads plan + issue acceptance criteria cold
  → posts findings as comment on issue (Sarah sees this at checkpoint)
  → returns PASS / CONCERNS / BLOCK
  → BLOCK → escalate to Sarah; do not proceed until resolved
  → CONCERNS with scope creep → escalate to Sarah; do not proceed until resolved
  → CONCERNS minor → log to state file (plan_critic_concerns), proceed
    (minor concerns are NOT re-run; they are passed as context to post-implementation critics)
  ↓                                                          STATE WRITTEN
⚑ HUMAN CHECKPOINT: Sarah approves plan
  Always required — even if plan critic returned PASS
  If an escalation occurred above, Sarah's resolution of that escalation
  serves as plan approval; no second confirmation needed
  ↓
[haven-implementer subagent] (sonnet)
  → TDD: failing tests first, then implementation
  → commits frequently, stops before PR creation
  ↓                                                          STATE WRITTEN
[haven-create-pr subagent] (sonnet)
  → branch naming, PR template, issue links, user story lookup
  → changelog row, draft flag
  ↓                                                          STATE WRITTEN
[/simplify skill]
  → fixes code for reuse, quality, efficiency
  → posts PR comment listing what was changed
  ↓                                                          STATE WRITTEN
[four critics dispatched as parallel Task calls]
  haven-code-quality-critic (sonnet)
  haven-product-vision-critic (opus)
  haven-safety-critic (sonnet)
  each posts gh pr review --comment independently
  state file written once all four return
  ↓                                                          STATE WRITTEN
Orchestrator synthesizes findings
  → any BLOCK → escalate to Sarah
  → CONCERNS only → apply fixes autonomously, re-run affected critic(s)
      if re-run also returns CONCERNS → escalate to Sarah (no further autonomous loops)
  → all PASS → proceed
  ↓
[superpowers:receiving-code-review] — process any remaining feedback
  ↓
commit + push
  ↓                                                          STATE WRITTEN
[/wrap-up-pr]
  → haven-pr-readiness check
  → CI checkbox if clear
  → delete ticket-in-progress.json
  ↓
STOP — hand to Sarah for merge
```

---

## Agent Roster

### New Agents

| Agent | Model | Job |
|---|---|---|
| `haven-create-pr` | sonnet | Branch naming, PR template, issue links, user story lookup, changelog row, draft flag. Imports `_shared/gh-conventions.md`. |
| `haven-plan-critic` | **opus** | Reviews plan against acceptance criteria, scope, established patterns, Haven principles. Posts findings as issue comment. Runs before implementation — a bad plan wastes everything downstream. |
| `haven-code-quality-critic` | sonnet | RN/Expo/TypeScript idioms, Haven's established patterns from `docs/decisions.md`, hook/component structure, test coverage quality. Receives `plan_critic_concerns` from state as additional context. |
| `haven-product-vision-critic` | **opus** | Does this fulfill the user story intent? Does it feel like Haven? UX fit, empty states, tone, no scores/streaks/pressure. Receives `plan_critic_concerns` from state as additional context. |
| `haven-safety-critic` | sonnet | Privacy (nothing leaves device), data safety (migrations + integrity tests), judgmental language in UI strings, workflow artifacts (changelog entry, issue links). Rule-based, binary pass/fail. |

### Modified Agents

| Agent | Change |
|---|---|
| `haven-technical-planner` | Add `model: opus`, `allowed-tools`, `references: [_shared/haven-context.md]` |
| `haven-implementer` | Stops before PR creation (hands off to `haven-create-pr`). Add frontmatter. |

### Retired Agents

| Agent | Reason |
|---|---|
| `haven-reviewer` | Responsibilities split across four critics: privacy/data safety/language → haven-safety-critic; architecture/patterns → haven-code-quality-critic; UX/product vision → haven-product-vision-critic; workflow artifacts (changelog, issue links) → haven-safety-critic |

### Retired Skills

| Skill | Reason |
|---|---|
| `superpowers:requesting-code-review` | Replaced by the four domain-specific critics, which provide deeper Haven-specific coverage than a general-purpose code reviewer |

### Unchanged Agents

- `haven-technical-health` — runs independently between milestones, not part of the per-ticket flow

---

## Shared Files

| File | Purpose | Imported by |
|---|---|---|
| `_shared/haven-context.md` | Haven domain knowledge: stack, product principles, key doc locations | All critics, haven-technical-planner |
| `_shared/gh-conventions.md` | PR conventions, issue linking rules, draft flag, never-close-user-stories | haven-create-pr, haven-implementer, haven-safety-critic, wrap-up-pr, haven-pr-readiness |
| `_shared/branch-check.md` | Branch safety check (existing — do not create) | haven-create-pr |

---

## Supporting Files (complete-ticket)

| File | Purpose |
|---|---|
| `complete-ticket/SKILL.md` | Orchestrator skill — instructs Claude to create a TaskCreate todo list for each flow step, execute them in order, write the JSON state file directly (no subagent) after each step using the schema from state-schema.md, and follow escalation-policy.md for all go/no-go decisions |
| `complete-ticket/escalation-policy.md` | Explicit criteria for when to ask Sarah vs. proceed autonomously |
| `complete-ticket/state-schema.md` | Documents ticket-in-progress.json shape, valid step values, and staleness check logic |

---

## Escalation Policy

Documented fully in `complete-ticket/escalation-policy.md`. Summary:

**Always escalate:**
- Plan critic returns BLOCK
- Plan critic returns CONCERNS with scope creep
- Any post-implementation critic returns BLOCK
- Any post-implementation critic returns CONCERNS on second pass (after one autonomous fix attempt)
- Plan introduces schema change not mentioned in the issue
- PR touches files outside expected scope
- CI fails after one fix attempt
- Ambiguous issue number / no clear next task

**Proceed autonomously:**
- Plan critic returns CONCERNS (minor, no scope creep) — log to state, proceed
- Post-implementation critics return CONCERNS → fix → re-run only the critic(s) that returned CONCERNS (not all four) → PASS
- PR is still in draft at wrap-up → mark ready automatically
- Critic subagent fails to return (crash/timeout) → result treated as null → escalate to Sarah

---

## Hooks

| Hook | Trigger | Action |
|---|---|---|
| Existing | PreToolUse `git commit` / `git push` | `npx tsc --noEmit` |
| **New** | `Stop` | If `ticket-in-progress.json` exists, write current step and issue number to stdout (appears in the conversation) so Sarah always knows state when Claude stops |

---

## Context Decisions

### gh-commands.md — retired
Replaced by: `allowed-tools` in frontmatter (constrains what each agent can call) + `_shared/gh-conventions.md` for policy rules imported only by agents that touch gh. Universal rules move to CLAUDE.md.

### docs/plans/ vs docs/superpowers/specs/
- `docs/plans/` — ephemeral per-ticket implementation plans. Gitignored. Deleted by wrap-up-pr after merge.
- `docs/superpowers/specs/` — committed design docs for significant workflow/architecture decisions. Persists.

### Frontmatter
All agents use `allowed-tools` to constrain tool access. Critics that don't touch gh don't import gh-conventions — keeps context lean (currently ~14% at session start before any work).

### Plan critic output visibility
The plan critic posts its findings as a comment on the GitHub issue — not just as internal state. Sarah sees this at the mandatory human checkpoint before approving the plan.

### superpowers:requesting-code-review
Retired. The four domain-specific critics collectively cover everything it provided, with Haven-specific depth added. No replacement needed — the critics are the replacement.

### MEMORY.md
Located at `~/.claude/projects/-Users-sarah-code-haven-app/memory/MEMORY.md` — outside the repo, not part of the implementation PR. Updated manually or by Claude during sessions.

---

## Files Changed

| File | Action |
|---|---|
| `.claude/skills/complete-ticket/SKILL.md` | Rewrite |
| `.claude/skills/complete-ticket/escalation-policy.md` | Create |
| `.claude/skills/complete-ticket/state-schema.md` | Create |
| `.claude/skills/_shared/haven-context.md` | Create |
| `.claude/skills/_shared/gh-conventions.md` | Create |
| `.claude/agents/haven-create-pr.md` | Create |
| `.claude/agents/haven-plan-critic.md` | Create |
| `.claude/agents/haven-code-quality-critic.md` | Create |
| `.claude/agents/haven-product-vision-critic.md` | Create |
| `.claude/agents/haven-safety-critic.md` | Create |
| `.claude/agents/haven-technical-planner.md` | Update (model: opus, frontmatter) |
| `.claude/agents/haven-implementer.md` | Update (stop before PR, frontmatter) |
| `.claude/agents/haven-reviewer.md` | Delete |
| `.claude/skills/simplify` (superpowers plugin) | No change required — invoked as-is |
| `.claude/skills/wrap-up-pr/SKILL.md` | Add state file deletion as final action — after haven-pr-readiness check and CI checkbox, before STOP |
| `.claude/skills/haven-pr-readiness/SKILL.md` | Add gh-conventions reference to frontmatter |
| `.claude/SDLC_Workflow.md` | Rewrite to reflect new flow, retire haven-reviewer and gh-commands.md |
| `.claude/CLAUDE.md` | Add docs/plans vs docs/superpowers/specs distinction |
| `CLAUDE.md` | Move universal rules from gh-commands.md |
| `.claude/settings.json` | Add Stop hook |
| `.claude/gh-commands.md` | Delete |
