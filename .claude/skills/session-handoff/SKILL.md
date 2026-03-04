---
name: session-handoff
description: Use when the user is done with a chunk of work and wants to end the session cleanly. Triggers on "handoff", "wrap up", "done for now", "clear context", "end session", or "switching tasks". Updates project state and writes a structured handoff message.
---

# Session Handoff

## Overview

Update persistent project state and produce a structured handoff message as your final reply. The claude-memory hook will inject this message into the next session automatically.

## When to Use

- User says "handoff", "wrap up", "done for now", "let's stop here"
- User is about to `/clear` or start a new session
- A logical chunk of work is complete

## Protocol

### 1. Update persistent state

Check and update each of these if relevant to the session's work:

| Artifact | When to update |
|----------|---------------|
| `MEMORY.md` (auto memory) | New gotchas, decisions, or patterns discovered |
| `docs/plans/*.md` | Plan completed or status changed — add status line |
| `CLAUDE.md` | New universal rules discovered |
| `BACKLOG.md` | Feature ideas mentioned but not implemented |

Skip any that don't apply. Don't manufacture updates.

### 2. Write the handoff message

Your **final assistant message** must follow this exact structure:

```
Handoff for next session:

## Where We Left Off
[1-2 sentences: what branch, what feature, what state]

## What's Done
- [Bullet list of completed items this session]

## What's Next
- [Bullet list of logical next steps, ordered by priority]

## Open Questions
- [Anything unresolved that the next session should address]
[Omit this section if none]
```

### 3. Rules

- **Be specific.** "Implemented the grading endpoint" not "made progress on API".
- **Include file paths** for anything the next session will need to find.
- **Include branch name** so the next session knows where to look.
- **Keep it under 300 words.** The hook truncates long messages.
- **This must be your last message.** Don't add "anything else?" after it.