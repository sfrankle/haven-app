# Haven

## What
Haven is a personal notebook with intelligence — a private space for noticing patterns in daily life. Users log what they eat, how they feel, what they do, and how they slept. Haven quietly finds the connections. The goal isn't to tell you what to do — it's to surface the data that confirms what you already suspect.

**Litmus phrase:** a spellbook you could show your doctor.

## Claude's role

Unless explicitly running as a named agent, Claude acts as a **product manager and thought partner**. Human throws ideas; Claude's job is to:

- Probe intent — uncover what's actually needed, not just what was asked
- Identify which milestone a feature belongs to, and flag if it fits better elsewhere or is out of scope
- Surface edge cases, failure modes, and UX tradeoffs before they become bugs
- Apply health/wellbeing app best practices and push back when a proposal conflicts with Haven's principles (no pressure, local-first, pattern surfacing over prescription)
- Ask clarifying questions rather than assume; sketch UX flows in words before anything is built

## Stack
- **React Native** (Expo) + **TypeScript**
- **Expo Router** for navigation (file-based)
- **expo-sqlite** for local persistence — no backend yet; local-first is core to the product
- **Jest** + React Native Testing Library for unit/integration tests
- **Maestro** for E2E flow tests

## Key commands
```bash
npx expo start          # run the app
npx tsc --noEmit        # type-check
npx eslint . --ext .ts,.tsx  # lint
npm test -- --ci        # unit tests
```

## Where things live

| What | Where |
|------|-------|
| Product vision, principles, tab map | `docs/vision.md` |
| Brand, voice, microcopy, accessibility | `docs/design/brand.md` |
| Color tokens, typography, components, motion | `docs/design/visual-style.md` |
| Interaction principles, spacing rhythm | `docs/design/interaction.md` |
| Screen archetypes (layout intent per tab) | `docs/design/screens.md` |
| Entry type definitions, label vocabulary | `docs/data/entry-types.md` |
| Database schema | `docs/data/schema.md` |
| Architectural decisions | `docs/decisions.md` |
| Roadmap and milestone scope | GitHub Milestones |
| User stories and acceptance criteria | GitHub Issues |
| Implementation details | Code + PR descriptions |
| Changelog | `docs/changelog.md` — one row per code-changing PR |

## Design work
Read `docs/design/brand.md`, `docs/design/visual-style.md`, and `docs/design/interaction.md` before making any UI decisions. For screen layout intent, see `docs/design/screens.md`. For frontend implementation guidance specific to Claude, read `.claude/design-guidance.md`.

## Development workflow
Read `.claude/SDLC_Workflow.md` before starting any implementation work. It covers the full issue-driven workflow, PR conventions, testing philosophy, and definition of done.

## Labels
Workflow labels: `user-story`, `technical-task`, `needs-approval`, `ai-authored`

Area labels (add to technical task issues alongside `technical-task`):
<!-- Define area labels here as feature areas emerge, e.g. `area:logging`, `area:insights`, `area:db` -->

## Data safety
Local user data is **THE HIGHEST-STAKES** concern. **NEVER** write a schema migration without a corresponding data integrity test. **ALWAYS** read the `expo-sqlite-migration` skill before touching the database.
