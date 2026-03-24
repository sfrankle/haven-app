---
name: wrap-up-pr
description: after PR is reviewed, edits have been made, confirm do final items on the pr.
---

Make a todo list of the following items. When starting a step, mark it as in-progress. When step completed, mark complete.

- Claude invokes **`haven-pr-readiness`** — runs the full readiness check and reports verdict
- If verdict is clear: check the CI box in the PR description (`gh pr edit <N> --body "..."`)
- Delete the local plan file from `docs/plans/` if one exists

Then stop. Human merges the PR.