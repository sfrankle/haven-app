# Claude Code Settings

## File paths with parentheses

Always quote file paths that contain parentheses (e.g. `app/(tabs)/(tend)/...`). Unquoted paths with `(` `)` are treated as glob patterns by zsh and will fail.

```bash
# wrong
git add app/(tabs)/(tend)/log/emotion/tier2.tsx

# right
git add "app/(tabs)/(tend)/log/emotion/tier2.tsx"
```

## Commit messages

Always use single-line commit messages:

```
git commit -m "type: message"
```

Never use heredoc style (`$(cat <<'EOF'`). The message must fit on one line — drop bullet-point details; they belong in the PR description, not the commit.
