---
name: break-down-user-stories
description: Analyze user stories in a GitHub milestone and create detailed technical task issues. Use when asked to "break down" a milestone or user stories into implementation tasks.
---

## Process

### 1. Read the milestone

Fetch all user stories and existing technical tasks in the target milestone:
```bash
gh issue list --milestone "<MILESTONE TITLE>" --label "user-story" --state open --limit 100 --json number,title,body
gh issue list --milestone "<MILESTONE TITLE>" --label "technical-task" --state all --limit 100 --json number,title,body,state
```

Parse each technical task body for "Contributes to #N" to map tasks → user stories.

### 2. Check for missing user stories
Before breaking down tasks, compare the milestone's user stories against `docs/spec.md` and related docs. Ask: are there user stories missing from this milestone that the spec implies? Flag any gaps — don't silently skip them.

### 3. Audit the codebase
For each user story, explore the codebase to understand:
- What already exists (screens, components, data models, queries)
- What's missing or incomplete relative to the story's requirements
- Dependencies between stories

### 4. Think ahead to future milestones
For each proposed technical task, consider: does the implementation approach here constrain or create work in later milestones? Call out cases where:
- Data model decisions affect future features or query patterns
- A "simple for MVP" UI decision relies on a data model that needs to support more later — note that explicitly
- Shared infrastructure (shared components, shared patterns) should be built once, not per-story

### 5. Propose technical tasks
Evaluate existing technical tasks:
- Are they well-formed (clear acceptance criteria, proper user story link, appropriate scope)?
- Do they match current user story requirements?
- Are they still relevant or have they been superseded?

Identify cross-cutting concerns — shared infrastructure needed by multiple stories (e.g. a shared date picker, a shared input component) should be one task, not duplicated.

Present a summary to the user:
- Which user stories already have technical tasks (and what they are)
- Which existing technical tasks should be **removed** (poorly scoped, irrelevant, or duplicates)
- Which existing technical tasks should be **updated** (incomplete acceptance criteria, scope changes)
- Which user stories are already fully implemented
- Which user stories need new technical tasks, and what tasks are needed
- Suggested ordering / dependencies between tasks
- Any forward-looking risks or constraints identified in step 4

**Wait for user approval before making changes (closing/editing issues, creating new ones).**

### 6. Clean up existing issues

**Close issues:**
```bash
gh issue close <NUMBER> --comment "Closing: <reason>"
```

**Update issues:**
```bash
gh issue edit <NUMBER> --body "<updated body>"
```

### 7. Create new issues

Get the current area labels from CLAUDE.md before creating issues.

For each approved technical task, create in one command:
See `.github/ISSUE_TEMPLATE/technical-task.md` for template
```bash
gh issue create \
  --title "<title>" \
  --milestone "<MILESTONE TITLE>" \
  --label "technical-task,<area-label>,ai-authored" \
  --body "<TEMPLATE>"
```

### 8. Set blocking relationships between technical tasks
For each dependency identified in step 5, note it in the blocked issue's Notes section:

```
Blocked by: #N
```

Use `gh issue edit` to update the body. The `next-task` skill reads this text to determine what is unblocked. See `.claude/gh-commands.md` for the correct edit pattern.

### 9. Link technical tasks to their user stories

For each technical task, set a formal GitHub Relationship: the task **blocks** the user story. Use the commands from `.claude/gh-commands.md` (Issue Relationships section).


Repeat for every task→story pair. This creates a visible Relationship in the GitHub issue sidebar and is the canonical linkage — not text in the body.

### 10. Summary
After creating all issues, present a table:
| Issue | Title | User Story | Blocked by |
|-------|-------|------------|------------|
| #N    | ...   | #M         | #X, #Y     |
