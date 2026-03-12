## Starting work

Natural language triggers for skills:
- **"what's next?"** → Claude runs `next-task`
- **"let's review milestone #N"** or **"is milestone #N ready?"** → Claude runs `review-milestone`
- **"let's break down milestone #N"** → Claude runs `break-down-user-stories`

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
1. Human and Claude define a milestone together (a coherent set of user stories for a release or sprint)
2. Claude invokes **`review-milestone`** to check stories for completeness and coherence before breakdown
3. Human approves the milestone
4. Claude invokes **`break-down-user-stories`** to create technical task issues with detailed acceptance criteria
5. Use **`next-task`** to determine what to pick up next

---

### Technical Task Lifecycle
1. Claude dispatches **`haven-technical-planner`** — explores codebase, writes a full implementation plan to `docs/plans/` (local-only, never committed), posts a summary comment on the issue
2. Human approves the plan (via the issue comment — the local plan file is for Claude's use only)
3. Claude dispatches **`haven-implementer`** — implements the approved plan, opens a **draft PR** linking `Closes #N` (the technical task)
   - PRs that **only** update Claude instructions or docs do not need a related issue
4. PRs reference user stories with "Contributes to #M" — never `Closes` on user stories
   - To find the right user story: check the technical task's milestone, then run `gh issue list --milestone "<name>" --label user-story` to find candidates
   - Only link a user story you can directly trace to — if the PR is pure infrastructure that enables many stories, omit `Contributes to` rather than guessing
   - PRs that **only** update Claude instructions or docs do not need a related issue
5. Claude runs **`/simplify`** — reviews changed code for reuse, quality, and efficiency; fixes issues found
6. Claude dispatches **`haven-reviewer`** when implementation is complete
7. Human reviews; Claude uses **`superpowers:receiving-code-review`** to process feedback
8. After applying review feedback, Claude:
   - Checks the PR's CI pipeline (`gh pr checks <N>`) and confirms all checks pass
   - Verifies all new or changed code has appropriate test coverage (new tests added or existing tests updated)
   - Posts a comment on the PR summarising test status: which tests cover the changes, and confirmation that CI checks pass
9. Human merges; Claude checks out main and pulls
10. **User stories are closed manually** by the human after all contributing technical tasks are merged

### GitHub CLI
- All agents and skills must use commands from `.claude/gh-commands.md` as the canonical reference
- If a `gh` command fails, update `.claude/gh-commands.md` immediately — add the broken command and the correct replacement before continuing
- Do not reuse `gh` commands from old skills or external sources without verifying against this file

### Ambiguity Handling
- When a user story or requirement is unclear, Claude asks the human before writing the plan
- Claude may check `docs/` and `.claude/local/` for existing context first, but defaults to asking rather than assuming
- `.claude/local/` is gitignored — it holds private context docs the human wants available to Claude but not committed (design notes, research, personal context)

---

### Definition of Done
Defined in `haven-implementer.md` (Quality Checklist). That is the canonical source — do not duplicate it here.

---

### Testing Philosophy

Defined in `app/CLAUDE.md`.


---

### PR Conventions
- Always start as **draft**
- Each PR is associated with 1 table entry in `docs/changelog.md`
- Each PR updates other docs if relevant (`docs/decisions.md`, schema snapshots, design/, ux/) **in the commits**
- **NEVER commit directly to `main`.** All changes go through a feature branch and PR.
- **Don't use git worktrees** unless explicitly asked.

**Branch naming:**
- `feat/<description>` — new features
- `fix/<description>` — bug fixes
- `refactor/<description>` — code refactoring
- `chore/<description>` — maintenance, docs, tooling

**Commit messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
- Example: `feat: add daily check-in flow`

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
User says "alright, let's wrap this up":

---

### Hotfix Workflow
For urgent fixes to `main`:
1. Create a `fix/<description>` branch from `main`
2. Follow the same PR process — no shortcuts on CI or review
3. Flag urgency in the PR description

---

### Automation Notes (future hooks to configure)
The following steps are candidates for Claude Code hooks (run automatically, no invocation needed):
- `superpowers:verification-before-completion` — trigger before any commit/push
- `superpowers:test-driven-development` — trigger at start of implementation

These are not yet configured as hooks. Until then, invoke the skills explicitly.
