# Routines — Concept & Vision

> **Status: deferred, milestone TBD.** This document captures the vision and open design questions. No implementation decisions are final.

---

## What routines are

Routines are pre-configured checklists that make recurring logging effortless. The user defines a routine once — what to do, what to log when they do it — and from then on, completing it is a single tap per item.

The inspiration: a physical checklist on the wall. You work through it in the morning. Each item you complete, you mark off. Haven's version does the same thing, but the checkmark also creates a log entry — automatically, with no extra steps.

---

## How they work

### Routine groups
A routine is a named group of items (e.g. Nourish, Center, Anchor). Users create their own groups — there are no defaults. (A future onboarding milestone may introduce one example group to teach the concept.)

Groups are not entry types — they're organisational. A single group can contain items of any entry type.

### Routine items
Each item in a routine is a pre-configured log entry. When the user checks it off, that entry is saved immediately — no submit button, no extra steps.

Items can be:
- **Food entries** — e.g. "Breakfast: blueberries, coffee" saves a food log with those labels on check
- **Activity entries** — e.g. "Yoga" saves an activity log on check
- **Custom / freeform** — e.g. "Brush teeth", "Take meds" — saves as a custom activity or freeform marker entry; binary done/not-done

When configuring a routine item, the user defines exactly what gets saved. A "breakfast" item might be pre-loaded with the user's typical labels. Execution is a single tap.

### Logging behaviour
- Each item saves **immediately on check** — no batch submit for the group
- Checked items dim or disappear to signal completion
- The user can move between groups freely and return to complete items later
- All entries created via a routine are tagged with their group (e.g. `routine:nourish`) so they can be filtered and correlated in Weave

### Progressive routines
Routine items can have targets that change over time — e.g. week 1: 10 push-ups, week 2: 12 push-ups. The user can pre-schedule progression or adjust as they go. When logging, the target is shown; the user records what they actually did. No judgment if actual < target — doing some is better than none.

This supports externally-sourced plans (doctor-prescribed PT, a 6-week training program) as well as self-designed ones.

---

## Why the tagging matters

Entries created via routine carry a `routine:[group-name]` tag. This means:
- In Trace: you can see which entries came from routine completion vs manual logging
- In Weave: you can ask "does completing my Nourish routine correlate with better energy?"
- Over time: Haven can surface compliance patterns — not as pressure, but as data ("you completed your morning routine 4 out of 7 days last week")

---

## Where routines live in the UI

**Open question.** Current options:

- **Anchor tab** — Anchor is currently defined as "grounding activity suggestions." Routines are related (both are about intentional daily habits) but different — suggestions are passive (Haven offers ideas), routines are active (user-defined commitments). May be too much for one tab.
- **Separate Routines tab** — gives the feature the space it deserves but adds a 6th tab to the nav. Would require rethinking the tab structure.
- **Within Tend** — routines as a section of the home screen, accessible without a dedicated tab. Keeps nav lean but may bury the feature.

This is a navigation architecture decision that should be made when the feature is closer to implementation.

---

## Open questions

- What is the right milestone for routines? Milestone 8 scope needs updating once this vision is clearer.
- Does Anchor tab get redefined to include routines, or does the tab map change?
- For progressive routine items, how does the user record "what I actually did" vs the target — does it open a mini-log flow, or is there an inline input on the checklist?
- Can a routine item be skipped without logging? (e.g. "I didn't do yoga today" — mark as skipped vs just leaving it unchecked)
- Reminders/nudges per routine item are in scope — what triggers them? Time of day? Location?
