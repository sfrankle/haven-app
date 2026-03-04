# Branch Check

Shared procedure used by `next-task` and `work-technical-task` before starting any new work.

## Steps

```bash
git branch --show-current
```

**If on `main`:** proceed.

**If on a feature branch:**

1. Check for an associated PR:
   ```bash
   gh pr list --head <branch> --state all --json number,title,state
   ```

2. **PR is merged or closed:** the branch work is done. Checkout main and pull, then proceed:
   ```bash
   git checkout main && git pull
   ```

3. **PR is open (draft or ready for review):** tell the user:
   > "It looks like you're mid-task on branch `<branch>` with PR #N open. Want to keep going on that, or switch to main?"
   Do not proceed until the user confirms.

4. **No PR exists:** tell the user:
   > "You're on branch `<branch>` with no open PR. Do you want to commit/stash and switch to main, or keep working here?"
   Do not proceed until the user confirms.
