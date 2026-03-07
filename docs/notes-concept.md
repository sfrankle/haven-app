# Notes — Concept & Vision

> **Status: deferred from MVP.** Notes are not in Milestone 1 · Core Logging. This document captures the vision and open design questions for a future milestone.

---

## What notes are

Notes are life context. They are not summaries of what you logged — they are the things that explain *why* the data looks the way it does.

A note is a timestamped entry that says: something happened. It sits alongside logged health data in the history, quietly marking inflection points. When you look back at a month and see a dip, a spike, a run of hard days — a note might explain it. Or it might remind you that the hard days weren't random.

---

## Why this matters

Health data doesn't exist in a vacuum. Patterns that look like symptoms are sometimes just life. Patterns that look like life are sometimes symptoms. Notes are the bridge.

Without notes, a user looking back at two weeks of unsettled sleep, low energy, and elevated stress might conclude they're getting sick — when actually they were closing on a house. With a note, the arc makes sense. They can tell their doctor: *"Things have been hard, but here's why. Here's when I expect it to level out."*

The goal isn't journaling. The goal is legible context — enough to interpret the data honestly.

---

## Use cases

### Life events
Major transitions create real, measurable impact on mood, sleep, energy, and physical state. A note marks the event so the data around it can be read in context.

Examples:
- Starting or stopping a medication
- A significant loss — a pet, a person, a relationship
- A major positive event — a proposal, a new job, a move into a new home
- A significant stressor — a difficult new manager, a financial shock, a family crisis
- A medical event — a diagnosis, a procedure, a significant symptom onset or resolution

### Ongoing stressors
Some context isn't a single event — it's a sustained condition. A renovation that drags on for months. A difficult period at work. A long recovery. Notes can mark the start, significant moments within it, and the resolution.

Example arc: renovation begins in November → contractors become difficult in January → rental deadline looms in February. Each note is a small marker. Together they explain why physical symptoms fluctuate, why sleep is disrupted, why stress logs are elevated across the whole period.

### Behavioural or environmental context
Sometimes a note explains why a particular day was an outlier — not because anything went wrong, but because the circumstances were different. Competitive vs casual. Alone vs social. Travel. Disrupted routine.

Examples:
- Attending a high-stakes event vs the same activity done casually
- Travelling across time zones
- Unusually poor sleep before an important day
- An unexpected change in routine

### Medical context for conversations
Notes make Haven useful as a record to bring to appointments. A user can pull up the last month of data and explain the peaks and troughs — not just show a chart, but narrate it. "This dip was when I started the medication. This spike was just a bad week at work."

---

## Design principles for notes

**Freestanding, not embedded.** A note is its own log entry — not a field on another entry. This avoids the problem of a note appearing multiple times when a session produces multiple entries (e.g. logging three physical states in one submission).

**Associated, not hierarchical.** A note can be linked to an entry type (Emotions, Physical, Activity) and/or to specific labels — so it surfaces in the right filtering contexts. A note about starting a medication is relevant when filtering Emotions *and* Physical. A note about a stressful event is relevant to Emotions. The association is metadata, not a parent-child relationship.

**Subtle in the timeline.** Notes appear as small indicators in Trace (a dot, an icon) — not as full rows competing with logged entries. Tapping an indicator reveals the note. The data stays primary; the note is context.

**Unstructured text, structured tags.** The note itself is freeform — just what the user wants to say. But tags or label associations allow the note to surface in the right places without requiring the user to categorise everything upfront.

**Optional and low friction.** No user should feel they need to explain their data. Notes exist for users who want to, when they want to. No prompts, no nudges.

---

## Open questions

- Where is a note logged from? Its own tile on Tend? A persistent quick-add gesture? Within an entry type flow as an optional final step?
- Can a note be associated with multiple entry types / labels simultaneously?
- How does the note indicator appear in Trace — per day, per entry cluster, or floating?
- What is the right milestone for notes? Likely after core logging and patterns are established, so users have data worth annotating.
