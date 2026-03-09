# Haven

> a spellbook you could show your doctor

Haven is a personal notebook with intelligence — a private space for noticing patterns in your daily life.

You log what you eat, how you feel, what you do, and how you slept. Haven quietly finds the connections. The goal isn't to tell you what to do — it's to show you the data that confirms what you already suspect: the things that are supposed to make you feel better actually do.

---

## What it does

```
Log fast  →  See patterns  →  Get proof the good stuff works
```

Every entry type is reachable in three taps or fewer. The app finds correlations automatically — you don't have to go looking for them. Over time, Haven becomes a record of your life that you could hand to a doctor and actually be proud of.

| Tab | Purpose |
|-----|---------|
| **Tend** | Home base for logging — everything starts here |
| **Trace** | Chronological history of what you've logged |
| **Weave** | Patterns and correlations the app has found |
| **Anchor** | Grounding activity suggestions *(coming later)* |
| **Settings** | Preferences, entry types, data controls |

**Entry types:** Slumber · Replenish · Nourish · Unveil · Attune · Journey

---

## Design philosophy

- **No pressure.** No scores, no streaks, no reminders that you missed a day.
- **Calm by default.** Muted palette, minimal motion, quiet confirmations.
- **Tap-first.** Quick selections over typing. Recent and frequent options surface automatically.
- **Exploration over prescription.** Insights are observations: *"You logged bloating 7/10 times after dairy."* Never: *"You should cut dairy."*
- **Privacy-first.** All data stays on your device. No accounts. No network calls. No cloud sync.

---

## Privacy

Your data never leaves your phone. There are no accounts, no analytics, no crash reporting that sends anything off-device. The app works fully without an internet connection. You can export everything at any time in standard formats you can actually use.

---

## Tech stack

- **React Native** (Expo) + TypeScript
- **Expo Router** — file-based navigation
- **expo-sqlite** — local-first persistence, no backend
- **Jest** + React Native Testing Library — unit and integration tests
- **Maestro** — E2E flow tests

---

## Development

```bash
npx expo start          # run the app
npx tsc --noEmit        # type-check
npx eslint . --ext .ts,.tsx  # lint
npm test -- --ci        # unit tests
```

The full development workflow — issue-driven, milestone-based, PR conventions — is in [`.claude/SDLC_Workflow.md`](.claude/SDLC_Workflow.md).

---

## Status

Early development. Pre-MVP. The roadmap lives in [GitHub Milestones](../../milestones).
