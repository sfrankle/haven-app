# Claude Code Settings

## File paths with parentheses

Always quote file paths that contain parentheses (e.g. `app/(tabs)/(tend)/...`). Unquoted paths with `(` `)` are treated as glob patterns by zsh and will fail.

```bash
# wrong
git add app/(tabs)/(tend)/log/emotion/tier2.tsx

# right
git add "app/(tabs)/(tend)/log/emotion/tier2.tsx"
```

## Branching — ALWAYS do this first

**NEVER commit to `main` directly.** Before any work:

```bash
git checkout -b feat/your-branch-name   # or fix/, chore/, refactor/
```

All changes go through a feature branch and PR — no exceptions, not even docs or config.

## Commit messages

Always use single-line commit messages:

```
git commit -m "type: message"
```

Never use heredoc style (`$(cat <<'EOF'`). The message must fit on one line — drop bullet-point details; they belong in the PR description, not the commit.

## Git commands — never chain with &&

Always run `git add` and `git commit` as separate Bash calls, never chained with `&&`. Chained commands don't match the `Bash(git:*)` allow rule and will prompt for permission.

```bash
# wrong
git add "file.tsx" && git commit -m "fix: something"

# right (two separate calls)
git add "file.tsx"
git commit -m "fix: something"
```

## Committing — one commit per logical change

Commit after each fix or self-contained change. Do not leave work uncommitted between responses. One commit per bug fix, feature, or refactor — not one giant commit at the end.


## Plan and spec locations

- `docs/plans/` — ephemeral per-ticket implementation plans. Gitignored. Deleted by `wrap-up-pr` after merge. Never commit files from here.
- `docs/superpowers/specs/` — design docs for significant workflow or architecture decisions. **Local-only (gitignored), never committed** — like plans. The durable record of a decision lives in its GitHub issue/PR; the spec file is a local working doc.
