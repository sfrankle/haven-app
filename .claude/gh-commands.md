# GitHub CLI Command Reference

## Meta

**When a `gh` command fails:** update this file immediately — add the broken command to the "Known Broken" section with the error, and document the correct replacement. This file is the canonical reference for all agents and skills.

**Before using a `gh` command not listed here:** check the GitHub CLI docs or test it first. Do not copy commands from old skills without verifying.

---

## Repo

**Owner/repo:** `sfrankle/haven-app` — use this directly in all commands, no need to resolve dynamically.

---

## Issues

```bash
# List issues with filters
gh issue list --milestone "<TITLE>" --label "<LABEL>" --state open --limit 100 --json number,title,body,labels,state

# View a single issue
gh issue view <NUMBER> --json number,title,body,labels,state,milestone

# Create an issue
gh issue create \
  --title "<title>" \
  --milestone "<MILESTONE TITLE>" \
  --label "<label1>,<label2>" \
  --body "<body>"

# Edit an issue body (use temp file for multi-line content)
gh issue view <NUMBER> --json body -q .body > /tmp/issue_body.md
# ... append to /tmp/issue_body.md ...
gh issue edit <NUMBER> --body "$(cat /tmp/issue_body.md)"

# Comment on an issue
gh issue comment <NUMBER> --repo sfrankle/haven-app --body "<comment>"

# Close an issue with a comment
gh issue close <NUMBER> --comment "<reason>"

# Check issue state
gh issue view <NUMBER> --json state -q .state
```

---

## Milestones

```bash
# List all milestones
gh api repos/<OWNER/REPO>/milestones --jq '.[] | {number, title, description, state}'

# Get a specific milestone
gh api repos/<OWNER/REPO>/milestones --jq '.[] | select(.title == "<TITLE>") | {number, title, description}'

# Create a milestone
gh api repos/<OWNER/REPO>/milestones \
  --method POST \
  --field title="<TITLE>" \
  --field description="<DESCRIPTION>"
```

---

## Pull Requests

```bash
# Create a draft PR
gh pr create --draft --title "<title>" --body "<body>"

# List PRs for a branch
gh pr list --head <branch> --state all --json number,title,state

# View a PR
gh pr view <NUMBER> --json number,title,body,state,comments

# Check PR status / CI
gh pr checks <NUMBER>

# Merge a PR
gh pr merge <NUMBER> --squash --delete-branch

# List inline review comments on a PR
gh api repos/sfrankle/haven-app/pulls/<NUMBER>/comments --jq '.[] | {id, path, line, body, user: .user.login}'

# Reply to an inline review comment (not a top-level comment)
gh api repos/sfrankle/haven-app/pulls/<NUMBER>/comments/<COMMENT_ID>/replies \
  --method POST \
  --field body="<reply text>"

# List top-level PR review threads (reviews with bodies)
gh api repos/sfrankle/haven-app/pulls/<NUMBER>/reviews --jq '.[] | {id, state, body, user: .user.login}'
```

---

## Labels

```bash
# List all labels in repo
gh label list

# Create a label
gh label create "<name>" --color "<hex>" --description "<description>"
```

---

## Issue Relationships

**Two uses of relationships:**

1. **Technical task → user story** (task blocks story): use the GraphQL `addBlockedBy` mutation — this sets a formal GitHub Relationship visible in the issue sidebar
2. **Technical task → technical task** (dependency between tasks): record as plain text in the issue body (`Blocked by: #N`) — `next-task` reads this text to determine what is unblocked

### Setting a formal Relationship (task blocks user story)

```bash
# Get node IDs
TASK_ID=$(gh issue view <TASK_NUMBER> --json id -q .id)
STORY_ID=$(gh issue view <STORY_NUMBER> --json id -q .id)

# Mark user story as blocked by technical task
gh api graphql -f query="mutation { addBlockedBy(input: { issueId: \"$STORY_ID\", blockingIssueId: \"$TASK_ID\" }) { issue { number } blockingIssue { number } } }"
```

### Recording task-to-task dependencies (plain text)

```
## Notes
Blocked by: #N
```

---

### Commit
Prefer single line commits, unless real value is being added. Repo uses squash commits on PRs anyways.

---

## Known Broken Commands

| Command / Pattern | Error | Correct Alternative |
|---|---|---|
| `gh api graphql addBlockedBy` (old note) | Previously believed broken — actually works. See Issue Relationships section above. | — |
| `gh project` (classic) | Deprecated — GitHub is sunsetting classic Projects | Use GitHub Projects v2 via the web UI, or avoid Projects-based workflows |
