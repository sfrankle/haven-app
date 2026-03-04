## Starting work

Say **"what's next?"** — Claude runs `next-task`, which checks branch state and returns the highest-priority unblocked task. That's the entry point for every session.

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
   - PRs that **only** update Claude instructions or docs do not need a related issue
5. Claude dispatches **`haven-reviewer`** (via `superpowers:requesting-code-review`) when implementation is complete
6. Human reviews; Claude uses **`superpowers:receiving-code-review`** to process feedback
7. Human merges; Claude checks out main and pulls
8. **User stories are closed manually** by the human after all contributing technical tasks are merged

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
A technical task is done when all of the following are true:
- [ ] All acceptance criteria in the issue are met
- [ ] Flow tests written or updated for any user-facing behavior (see Testing below)
- [ ] Migration test written if any schema change was made
- [ ] CI passes (lint, type-check, tests)
- [ ] `docs/changelog.md` has an entry for this PR
- [ ] Relevant docs updated (`docs/decisions.md`, schema snapshots, design/, ux/) if applicable
- [ ] No open PR comments

---

### Testing Philosophy

**Principle:** Test user flows, not lines of code. Every user-facing behavior should have a flow test. We do not track line coverage.

**Flow tests (E2E):**
- Use Maestro — declarative YAML flows that map to user-facing behavior
- Organized by feature/flow in the codebase, not by issue number
- Each technical task PR must include or update flow tests for any user-facing behavior it touches
- When a feature changes an existing flow, update the existing flow test — don't add a parallel one

**Data integrity tests:**
- Every schema migration must have a test (see `expo-sqlite-migration` skill)
- Tests must verify: schema is correct after migration AND original user data is intact
- Data safety is non-negotiable — corrupting local user data is the worst possible outcome

**Unit/integration tests:**
- Use Jest + React Native Testing Library for component and business logic tests
- Required for any non-trivial logic (calculations, transformations, state management)

**TDD:**
- Claude invokes **`superpowers:test-driven-development`** before writing implementation code

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
1. Claude invokes **`superpowers:verification-before-completion`**
2. Confirm no open comments on PR
3. Confirm CI is passing
4. Confirm `docs/changelog.md` has 1 entry for this PR, up to date with all work completed
5. Confirm PR description is up to date
6. Delete the local plan file from `docs/plans/`
7. Human merges the PR. Then: `git checkout main && git pull`.

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
