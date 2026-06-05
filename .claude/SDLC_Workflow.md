> ## ⚠️ Under testing — workflow in transition (2026-06-05)
>
> The autonomous flow described below (`complete-ticket`) is **canonical and the fallback** today. A **milestone-autonomy redesign** is being trialed that moves the human gate from per-ticket approval to the milestone boundary, runs execution as a GitHub Actions pipeline, and adds data-safety-aware auto-merge. The design decisions are tracked on **#170** (umbrella — no separate epic); the working spec lives local-only at `docs/superpowers/specs/2026-06-05-milestone-autonomy-workflow.md` (gitignored — not in the repo).
>
> **What the redesign changes in the flow below:**
> - **Step 4 (Human approves plan) is removed** — the plan-critic (→ Opus) becomes the load-bearing gate.
> - **Step 11 (Human merges) is replaced** by data-safety-aware auto-merge — schema/migration changes always escalate to a human; everything else merges itself when all critics pass + CI is green.
> - Target-state model assignments live in the spec, **not** the Agents table below (which still reflects current state — don't read it as the target).
>
> **Trial rules (Stage 1):** the pipeline runs with **auto-merge OFF** (opens PRs for human review) against **one trial milestone, pipeline-only**. Do **not** run `complete-ticket` against the trial milestone — two walkers can grab the same task. See the spec's *Migration & rollout* section for the staged rollout (trial → full → delete-last).

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

Run **`complete-ticket`** — the skill orchestrates all steps autonomously. See `.claude/skills/complete-ticket/SKILL.md` for the full flow.

Summary of what complete-ticket does:
1. Determines next task (`next-task`)
2. Plans (`haven-technical-planner`)
3. Critiques plan (`haven-plan-critic`)
4. **Human approves plan** (only mandatory checkpoint)
5. Implements (`haven-implementer`)
6. Creates PR (`haven-create-pr`)
7. Simplifies code (`/simplify`)
8. Critiques implementation in parallel: `haven-code-quality-critic`, `haven-product-vision-critic`, `haven-safety-critic`
9. Processes feedback autonomously; escalates blocks to human
10. Wraps up (`/wrap-up-pr`)
11. **Human merges**

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
