---
name: review-milestone
description: Review a milestone's user stories for completeness, coherence, and readiness for breakdown. Use when asked to "review milestone N", "is milestone N ready?", or before running break-down-user-stories for the first time.
---

## Purpose

This skill is a planning review — it does not create or modify issues. It produces a structured assessment the human can act on before committing to technical breakdown.

## Process

### 1. Read the milestone

```bash
gh issue list --milestone "<MILESTONE TITLE>" --label "user-story" --state open --limit 100 --json number,title,body,labels
gh api "repos/sfrankle/haven-app/milestones" --jq '.[] | select(.title == "<MILESTONE TITLE>") | {title, description}'
```

### 2. Read the spec and related docs
Read `docs/spec.md` in full. Also check `docs/decisions.md` for any decisions that affect this milestone's scope. Cross-reference the milestone's theme against the spec to understand what *should* be in it.

### 3. Assess each user story
For each story, evaluate:
- **Clarity** — is the story understandable without deep codebase knowledge? Would a developer know what done looks like?
- **Scope** — is it appropriately sized? (Too broad = needs splitting. Too narrow = might be a technical task, not a story.)
- **Tone** — does it follow Haven's non-judgmental, non-clinical language?
- **Milestone fit** — does it belong in this milestone's theme, or would it sit better elsewhere?

### 4. Check for gaps
Compare the stories against the spec and related milestones:
- Are there user-facing features implied by the spec that aren't represented?
- Are there pages or flows that have no story in this milestone but should?
- Are there stories in *other* milestones that logically depend on something missing here?
- Are there cross-cutting concerns (e.g. a shared UX pattern) that should be a story of their own?

### 5. Check milestone coherence
- Does the milestone have a clear, deliverable theme?
- Could a user meaningfully use the app after this milestone ships?
- Are there dependencies on a *different* milestone that aren't yet done?

### 6. Present findings

```
## Milestone Review: <Title>

### Summary
<2-3 sentence overall assessment — is this milestone ready for breakdown?>

### Stories: looks good
- #N Title — <one line why it's solid>

### Stories: concerns
- #N Title — <specific concern: too broad / unclear / wrong milestone / etc.>

### Gaps — missing user stories
- <description of gap> — suggested milestone: <this one / other>

### Coherence
<Assessment of whether the milestone hangs together as a shippable unit>

### Recommendation
Ready for breakdown / Needs these changes first: <list>
```

Do not create issues or make changes. Present findings and wait for the human to decide how to proceed. They may ask you to create missing stories, move stories, or go straight to `break-down-user-stories`.
