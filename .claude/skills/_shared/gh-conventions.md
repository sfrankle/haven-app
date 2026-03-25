# Haven GitHub Conventions

## Repo

`sfrankle/haven-app` — use this directly in all `gh` commands. No need to resolve dynamically.

## PR Rules

- Always open PRs as **draft**: `gh pr create --draft`
- One PR per technical task — link with `Closes #N`
- Link user story with `Contributes to #M` — **never** `Closes` on user stories; user stories are closed manually by the human after all contributing tasks merge
- Exception: PRs that only update Claude instructions or docs do not need issue references or a changelog entry

## Finding the Right User Story

```bash
# Get the milestone name from the technical task issue, then:
gh issue list --milestone "<MILESTONE TITLE>" --label user-story --state open \
  --json number,title --limit 50
```

Read the task issue body and the user story titles. Pick the user story this task directly contributes to. If none is clearly traceable, omit `Contributes to` — do not guess.

## Issue Links Format (PR body)

```
Closes #N
Contributes to #M
```

## Branch Naming

- `feat/<description>` — new features
- `fix/<description>` — bug fixes
- `refactor/<description>` — code refactoring
- `chore/<description>` — maintenance, docs, tooling

## Commit Style

Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
Single-line only. No heredoc. No bullet points in commit messages.

## Changelog

One row per PR in `docs/changelog.md`. Use the PR number (not issue number). Written for a skimmer — one brief sentence, no implementation detail.

## Key Commands

```bash
# Create draft PR (copy body from .github/pull_request_template.md)
gh pr create --draft --title "<title>" --body "<body>"

# Get PR number for current branch
gh pr view --json number -q .number

# Post review comment on PR
gh pr review <NUMBER> --comment --body "<markdown>"

# View issue
gh issue view <NUMBER> --json number,title,body,labels,state,milestone

# List issues by milestone + label
gh issue list --milestone "<TITLE>" --label "<LABEL>" --state open --limit 100 \
  --json number,title,body,labels,state

# Comment on issue
gh issue comment <NUMBER> --repo sfrankle/haven-app --body "<comment>"

# PR readiness check
gh pr view <NUMBER> --json title,state,isDraft,headRefName,statusCheckRollup,reviews,body

# Check CI status
gh pr checks <NUMBER>

# List inline review comments
gh api repos/sfrankle/haven-app/pulls/<NUMBER>/comments \
  --jq '.[] | {id, path, line, body, user: .user.login}'

# Reply to inline review comment
gh api repos/sfrankle/haven-app/pulls/<NUMBER>/comments/<COMMENT_ID>/replies \
  --method POST --field body="<reply text>"
```

## Known Issues

| Command / Pattern | Status |
|---|---|
| `gh api graphql addBlockedBy` | Works — use for task→user story relationships |
| `gh project` (classic) | Deprecated — avoid |
