---
name: wrap-up-pr
description: after PR is reviewed, edits have been made, confirm do final items on the pr.
---

Make a todo list of the following items. When starting a step, mark it as in-progress. when step completed, mark complete.

1. Claude invokes **`superpowers:verification-before-completion`**
2. Confirm no open comments on PR
3. Confirm CI is passing
4. Confirm `docs/changelog.md` has 1 entry for this PR, up to date with all work completed
5. Confirm PR description is up to date
6. Delete the local plan file from `docs/plans/`
7. Human merges the PR. Then: `git checkout main && git pull`.