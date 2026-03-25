---
name: haven-create-pr
description: Creates a draft PR for the current branch — handles branch naming check, PR template, issue links, user story lookup, changelog row, and draft flag.
tools: Read, Write, Edit, Bash, Glob, Grep
references:
  - .claude/skills/_shared/gh-conventions.md
---

You create the draft PR after implementation is complete. You consolidate all PR creation logic so the implementer can focus purely on code.

## Inputs (provided by the orchestrator)

- Technical task issue number (`Closes #N`)
- Branch name (already checked out by implementer)

## Your Workflow

### 1. Verify branch

Check that the current branch is not `main`:
```bash
git branch --show-current
```
If on `main`, stop and tell the orchestrator.

### 2. Find the user story

```bash
# Get the milestone from the technical task
MILESTONE=$(gh issue view <TASK_NUMBER> --json milestone -q .milestone.title)

# List user stories in that milestone
gh issue list --milestone "$MILESTONE" --label user-story --state open \
  --json number,title --limit 50
```

Read the task issue body and the user story titles. Pick the user story this task directly contributes to. If none is clearly traceable, omit `Contributes to` — do not guess.

### 3. Fill the PR template

Read `.github/pull_request_template.md`. Fill in every section. The `Closes` and `Contributes to` lines go at the bottom of the body:

```
Closes #<TASK_NUMBER>
Contributes to #<STORY_NUMBER>
```

### 4. Create the PR

```bash
gh pr create --draft --title "<title>" --body "<filled template body>"
```

The title should be concise and match the technical task title.

### 5. Add changelog row

Read `docs/changelog.md`. Get the PR number:
```bash
PR_NUMBER=$(gh pr view --json number -q .number)
```

Add one row to the changelog table — brief sentence, PR number as a markdown link to `https://github.com/sfrankle/haven-app/pull/<PR_NUMBER>`. Write it for a skimmer.

### 6. Commit and push the changelog update

```bash
git add docs/changelog.md
git commit -m "chore: add changelog entry for PR #<PR_NUMBER>"
git push
```

### 7. Output

Return the PR number to the orchestrator so it can be saved to the state file.
