# Haven Voice & Copy Guide

Single source of truth for language, tone, and copy decisions.

---

## Voice

Haven is minimal. When it does speak, it is quiet, warm, and faintly old-world — like a well-worn journal that knows you. It notices without commenting. It reflects without advising.

Haven does not:
- Advise or prescribe
- Diagnose or warn
- Judge or cheerlead
- Fill silence unnecessarily

Haven does:
- Reflect logged behaviour back to the user as plain observation
- Phrase insights as what they are — patterns, not conclusions
- Stay short; trust the user to draw their own meaning
- Use silence when no message is needed

---

## Two Registers

### Expressive — logging flow prompts, named empty states

This is where Haven's character lives. Copy here can be soft, slightly old-world, gently poetic. Not whimsical or woo-woo — grounded magic, the kind that feels earned.

> "What's upon your heart?"

> "What have you been about?"

### Functional — settings, errors, confirmations, data actions

Plain, minimal, warm but vanilla. No magic here — just clarity. The user is doing plumbing; don't get in the way.

> "Entry saved."

> "This will permanently delete your data. This cannot be undone."

---

## UK English

Haven uses British spellings throughout — in UI copy, docs, seed data, and code comments visible to users.

| Prefer | Avoid |
|--------|-------|
| organise, realise, recognise | organize, realize, recognize |
| behaviour, colour, favour | behavior, color, favor |
| centre, theatre | center, theater |
| programme | program (except software context) |
| whilst, amongst | while, among (either is fine; UK forms preferred) |

**Oxford comma:** yes, always.

---

## Entry Type Titles & Prompts

Titles appear as small labels beneath icons on the Tend grid. Icons carry primary meaning; titles are secondary. Prompts appear as the header copy inside each logging flow.

| Internal name | Title | Prompt |
|--------------|-------|--------|
| `sleep` | Slumber | "How long did you rest?" |
| `hydration` | Replenish | "How much water did you take in?" |
| `food` | Nourish | "What nourished you?" |
| `emotion` | Unveil | "What's upon your heart?" |
| `physical` | Attune | "How fares your body?" |
| `activity` | Journey | "What have you been about?" |

Titles use UK English, infinitive register. Internal `name` values are stable identifiers — never displayed to users.

---

## Microcopy Patterns

### Confirmations
Short, past tense, no celebration.

| Use | Avoid |
|-----|-------|
| "Entry saved." | "Great job!" / "Logged!" / "Done ✓" |
| "Deleted." | "Poof! It's gone." |

### Empty states
Neutral or quietly inviting. Never guilt-inducing, never performatively cheerful.

| Use | Avoid |
|-----|-------|
| "Nothing logged yet." | "You haven't logged anything! Start now 🎉" |
| "No patterns yet — keep logging." | "You missed logging yesterday." |

### Errors
Functional register. Plain, specific, actionable where possible. No alarm.

| Use | Avoid |
|-----|-------|
| "Couldn't save. Try again." | "Oops! Something went wrong 😬" |
| "No connection." | "Uh oh — you're offline!" |

### Insights (Weave)
Observations only. State what the data shows; never interpret or recommend.

| Use | Avoid |
|-----|-------|
| "You've logged bloating 7 out of 10 times after dairy." | "You should reduce dairy." |
| "Sleep under 6 hours often appears before low-energy days." | "You need more sleep." |

### Privacy
Explicit but quiet. No fear, no alarm.

> "Your data stays on your device."

---

## Things to Avoid

- **Cheerleading** — streaks, congratulations, encouragement, motivational framing.
0 **Productivity framing** — implying the user should have done more, been busier, been more consistent.
- **Clinical language** — symptoms listed like a medical index, diagnostic framing, severity as medical significance.
- **Urgency or alarm** — warning colours, exclamation marks, push pressure.
- **Cutesy filler** — "Oops!", "Woohoo!", "Uh oh", emoji in functional copy.
- **American spellings** — see UK English table above.
- **"Non-judgmental"** — the principle is real; express it through behaviour, never as a label. No scores, no streaks, no negative empty states. One canonical statement lives in `vision.md`; do not repeat across docs.
