---
name: wrap-up-pr
description: Use after a PR has been reviewed and all edits are made — runs final pre-merge checks (CI status, checklist, changelog, review comment resolution).
---

Make a todo list of the following items. When starting a step, mark it as in-progress. When step completed, mark complete.

- Claude invokes **`haven-pr-readiness`** — runs the full readiness check and reports verdict
- If `haven-pr-readiness` returns a passing verdict AND CI is confirmed passing via `gh pr checks <N>`: check the CI box in the PR description (`gh pr edit <N> --body "..."`)
- Delete the local plan file from `docs/plans/` if one exists
- Delete `docs/plans/ticket-in-progress.json` if it exists:
  ```bash
  rm -f .claude/local/ticket-in-progress.json
  ```

Then stop. Human merges the PR.