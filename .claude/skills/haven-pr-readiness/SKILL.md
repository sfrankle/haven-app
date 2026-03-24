---
name: haven-pr-readiness
description: Use when reviewing a Haven PR for merge-readiness — checks commits, CI, Haven conventions, review comment resolution, and overall completeness before the human merges
---

# Haven PR Readiness Review

Answers: is this PR safe to merge? Used standalone (fresh-instance review) or invoked by `wrap-up-pr` at the end of the implementation workflow.

## Run this

Use the **PR readiness check** command from `.claude/gh-commands.md`.

## Five checks

### 1. All changes committed and pushed?

```bash
git log --oneline origin/main..<branch>
```

- Working tree should be clean (no uncommitted changes relevant to the PR)
- All expected commits appear in the log

### 2. CI passing?

Look at `statusCheckRollup` in the PR JSON. The "Type-check, Lint, Test" check must show `conclusion: SUCCESS`. If it's absent or failing, **stop here**.

### 3. Haven conventions met?

Check the PR body and commits:

| Item | Where to look |
|------|---------------|
| `Closes #N` (technical task) | PR body |
| `Contributes to #M` (user story) | PR body |
| `docs/changelog.md` entry accurate | Read the new row in `docs/changelog.md` and confirm it describes what was actually built — not a stale description from early in the task |
| PR description accurate | Read the PR body and confirm it reflects the final implementation, not an outdated draft |
| No schema change → no migration needed | PR body / file list |
| Schema change → migration + data integrity test present | PR body checklist |
| No judgmental language in UI strings | PR body checklist |
| No network calls or off-device transmission | PR body checklist |
| TDD followed (failing tests before implementation) | Commit order: test commit precedes implementation commit |

### 4. Review comments addressed?

The `reviews` field from the readiness check command contains all review bodies. For each review:

- Read each review body for flagged issues
- Cross-reference against commits **after** the review timestamp
- If reviewer raised an issue and no subsequent commit addresses it, **flag as open**
- "COMMENTED" state (not "APPROVED") is normal for this project — don't treat as blocking

### 5. Draft status

Check `isDraft`. If `true`, the PR cannot be merged. Ask the human if they want to mark it ready.

## Assessment template

```
**PR #N — [title]**

1. Committed & pushed: ✅ / ⚠️ [detail]
2. CI: ✅ passing / ❌ failing / ⏳ pending
3. Haven conventions: ✅ / ⚠️ [what's missing]
4. Review comments: ✅ all addressed / ⚠️ [open items]
5. Draft: ✅ ready / ⚠️ still draft

**Verdict:** Ready to merge / Needs [X] before merge
```

## Common misses without this skill

- Forgetting to check draft status (PR looks complete but can't be merged)
- Treating "COMMENTED" review state as blocking (it isn't)
- Not cross-referencing review comments against post-review commits (easy to assume addressed without verifying)
- Missing Haven-specific items: changelog entry, issue links, migration check
