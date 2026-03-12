---
name: wrap-up-pr
description: after PR is reviewed, edits have been made, confirm do final items on the pr.
---

Make a todo list of the following items. When starting a step, mark it as in-progress. when step completed, mark complete.

- Claude invokes **`superpowers:verification-before-completion`**
- Confirm no local changes; confirm all commits pushed.
- Confirm no open comments on PR
- Confirm CI is passing
- Confirm `docs/changelog.md` has 1 entry for this PR, with a summary of work completed in PR. confirm PR reference is correct.
- Confirm PR description is up to date
- Delete the local plan file from `docs/plans/`

Then stop. Human merges the PR.