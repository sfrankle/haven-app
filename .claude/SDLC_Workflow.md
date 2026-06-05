> ## ⚠️ Workflow in transition (2026-06-05)
>
> **Two flows exist.** Today, **use `complete-ticket`** — it is canonical and the fallback (see *Technical Task Lifecycle → Current flow*). In parallel we are building a **milestone-autonomy pipeline** (*Technical Task Lifecycle → Pipeline flow*) that runs a ticket end-to-end as a GitHub Actions job, with the pipeline — not Claude — as orchestrator, and the human gate moved from per-ticket plan-approval to the **milestone boundary + genuine escalations**.
>
> **Status:** the Stage-1 scaffold (DAG + resolver + an inert workflow) is in **PR #176**; the per-ticket orchestration is designed (`docs/superpowers/specs/2026-06-05-pipeline-orchestration-design.md`) and planned (`docs/plans/170-pipeline-orchestration.md`) but **not yet operational**. All redesign decisions are tracked on **#170** (umbrella — no separate epic). Specs and plans are local-only (gitignored); the durable record lives on the issue/PR.
>
> The **Agents** table below reflects **current** state, not the target — e.g. under the redesign `haven-code-quality-critic` is renamed and slimmed to `haven-conventions-critic`, and model assignments shift (see the spec).

## Starting work

Natural language triggers for skills:
- **"what's next?"** → Claude runs `next-task`
- **"complete ticket"** or **"work on #N"** → Claude runs `complete-ticket`
- **"let's review milestone #N"** or **"is milestone #N ready?"** → Claude runs `review-milestone`
- **"let's break down milestone #N"** → Claude runs `break-down-user-stories`
- **"is this PR ready?"** or **"review PR #N"** → Claude runs `haven-pr-readiness`

---

## Workflow

Haven uses an issue-driven development workflow. All work flows through GitHub Issues and Milestones.

---

### Issue Hierarchy
- **User stories** (label: `user-story`) — product-level features, grouped by milestone
- **Technical tasks** (label: `technical-task`) — implementation units, linked to user stories
- One technical task = one PR. A user story may span multiple technical tasks.

### Labels
| Label | Meaning |
|---|---|
| `user-story` | Product-level feature |
| `technical-task` | Implementation unit linked to a user story |
| `needs-approval` | Claude-drafted issue awaiting human review; remove label to approve |
| `ai-authored` | Added to every issue, milestone, or PR Claude creates |

---

### User Story Creation
- Claude drafts user stories based on conversation with the human
- Every Claude-drafted story gets labels: `user-story` + `needs-approval` + `ai-authored`
- Human reviews and removes `needs-approval` to approve
- Work on a user story cannot begin until `needs-approval` is removed

---

### Milestone Lifecycle
1. Human and Claude define a milestone together
2. Claude invokes **`review-milestone`** to check stories for completeness and coherence before breakdown
3. Human approves the milestone
4. Claude invokes **`break-down-user-stories`** to create technical task issues with detailed acceptance criteria
5. Use **`next-task`** to determine what to pick up next

---

### Technical Task Lifecycle

Two flows, one in transition (see the banner). Both take **one technical task → one PR**.

#### Current flow — `complete-ticket` (canonical today)

Run **`complete-ticket`** — the skill orchestrates every step; **Claude is the orchestrator**. See `.claude/skills/complete-ticket/SKILL.md` for the full flow.

1. Determine next task (`next-task`)
2. Plan (`haven-technical-planner`)
3. Critique plan (`haven-plan-critic`)
4. **Human approves plan** (only mandatory checkpoint)
5. Implement (`haven-implementer`)
6. Create draft PR (`haven-create-pr`)
7. Simplify (`/simplify`)
8. Critique in parallel: `haven-code-quality-critic`, `haven-product-vision-critic`, `haven-safety-critic`
9. Process feedback autonomously; escalate blocks to human
10. Wrap up (`/wrap-up-pr`)
11. **Human merges**

#### Pipeline flow — milestone-autonomy (in development, #170)

Here the **pipeline is the orchestrator** (deterministic bash + YAML in a GitHub Actions job), *not* Claude. Each cognitive step is a separate, focused, least-privilege `claude-code-action` call; bash owns sequencing and every gate decision. Human gates move to: **milestone/DAG approval up front**, **genuine escalations**, and the **milestone boundary** (the pipeline never auto-advances to the next milestone).

Per-ticket sequence (one job, shared checkout; `.pipeline/` holds run-local artifacts, the **branch + GitHub state are the durable record**):

1. **Resolve** the next unblocked task from the DAG (`docs/tasks.json` + `.github/scripts/next-task.mjs`).
2. **Locate** the resume point from durable signals (**branch-as-checkpoint**) — a re-run continues from the first unfinished phase, it does not redo completed work.
3. **Plan → plan-critic** (both shell-less: `Read,Grep,Glob,Write`; bash pre-fetches the issue and posts their findings — the AI judges, bash fetches and posts).
4. **GATE-1** (bash): plan BLOCK / ambiguous / **touches schema** → label `blocked-on-human`, comment, and **stop before spending implement tokens**. Schema/migration changes are a data-safety escalation, **always**.
5. **Implement** (TDD) → **`/code-review`** → **`/simplify`** — each its own commit.
6. Open a **draft PR**.
7. **Critics** — conventions, product-vision, safety (shell-less: read a pre-built `diff.patch`, write a verdict + findings; bash posts each as a PR comment).
8. **GATE-2** (bash): any critic BLOCK → one round of `receiving-code-review` fixes; else stop.
9. **Stage 1:** stop at the **draft PR** — a human reviews every run (auto-merge OFF). **Stage 2 (later flip):** data-safety-aware auto-merge — all-PASS + CI-green + non-schema merges itself; schema always escalates.

**Escalation & resume:** a stopped Actions run can't pause — it posts, stops, and resumes on a fresh run. You answer in the thread (optionally via `@claude`), then re-run with input `resume_task: <task_id>`. Because the branch is the checkpoint, a resume with no branch yet **always re-plans and re-runs GATE-1**, so a schema/ambiguity/scope escalation can never be slipped past on a resume.

**Stage-1 invariants:** `workflow_dispatch`-only (no `schedule:`), auto-merge OFF, and the `@claude` responder (`claude.yml`) stays read-only. **Don't run `complete-ticket` against a milestone the pipeline owns** — two walkers can grab the same task.

---

### Agents

| Agent | Role | Model |
|---|---|---|
| `haven-technical-planner` | Explores codebase, writes implementation plan, posts issue comment | opus |
| `haven-implementer` | Executes plan with TDD, commits; stops before PR creation | sonnet |
| `haven-create-pr` | Creates draft PR, fills template, writes changelog row | sonnet |
| `haven-plan-critic` | Reviews plan before implementation; posts findings to issue | opus |
| `haven-code-quality-critic` | Reviews code against RN/Expo/TS patterns and Haven conventions | sonnet |
| `haven-product-vision-critic` | Reviews product vision fit, UX, and user story fulfillment | opus |
| `haven-safety-critic` | Reviews privacy, data safety, tone, workflow artifacts | sonnet |
| `haven-technical-health` | Scans for tech debt and architecture gaps; run between milestones | sonnet |

---

### GitHub Conventions
- All `gh` commands and PR rules: see `.claude/skills/_shared/gh-conventions.md`
- Repo: `sfrankle/haven-app`

### Ambiguity Handling
- When a user story or requirement is unclear, Claude asks the human before writing the plan
- Claude may check `docs/` and `.claude/local/` for existing context first, but defaults to asking rather than assuming
- `.claude/local/` is gitignored — private context docs + ticket state file

---

### Definition of Done
Defined in `haven-implementer.md` (Quality Checklist). That is the canonical source.

---

### Testing Philosophy
Defined in `app/CLAUDE.md`.

---

### PR Conventions
- Always start as **draft**
- Each PR is associated with 1 table entry in `docs/changelog.md`
- Each PR updates other docs if relevant (`docs/decisions.md`, schema snapshots, `design/`) **in the commits**
- **NEVER commit directly to `main`.** All changes go through a feature branch and PR.
- **Don't use git worktrees** unless explicitly asked.

**Branch naming:**
- `feat/<description>` — new features
- `fix/<description>` — bug fixes
- `refactor/<description>` — code refactoring
- `chore/<description>` — maintenance, docs, tooling

**Commit messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
- Single-line only. No heredoc.

---

### PR Review Process
- If review feedback requires **minor changes** (typos, small tweaks), push new commits to the branch
- If review feedback requires **major changes** (approach is wrong, significant rework needed):
  1. Close the PR with a comment explaining why
  2. Update the plan in `docs/plans/` based on feedback
  3. Create a new branch and implement the revised approach
  4. Open a new PR
- **Never force push** to a PR branch that's under review unless explicitly requested

---

### Close PR Process
User says "alright, let's wrap this up" or "wrap up this PR": run `/wrap-up-pr`

A fresh-instance review at any point: run `haven-pr-readiness`

---

### Hotfix Workflow
For urgent fixes to `main`:
1. Create a `fix/<description>` branch from `main`
2. Follow the same PR process — no shortcuts on CI or review
3. Flag urgency in the PR description

---

### Automation Notes

**Active hooks (`.claude/settings.json`):**
- Pre-commit/push type-check — runs `npx tsc --noEmit` before any `git commit` or `git push`; blocks if type errors are present
- Stop — prints current ticket state (issue #, step) if `docs/plans/ticket-in-progress.json` exists

**Not hookable (complete-ticket handles these):**
- `superpowers:test-driven-development` — requires judgment about when implementation starts
- Critic dispatch — requires knowing PR number, SHAs, and plan context
