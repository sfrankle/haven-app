# Haven

## What
Haven is a personal notebook with intelligence — a private, non-judgmental space for noticing patterns in daily life. Users log what they eat, how they feel, what they do, and how they slept. Haven quietly finds the connections. The goal isn't to tell you what to do — it's to surface the data that confirms what you already suspect.

**Litmus phrase:** a spellbook you could show your doctor.

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

## Development workflow
Read `.claude/SDLC_Workflow.md` before starting any implementation work. It covers the full issue-driven workflow, PR conventions, testing philosophy, and definition of done.

## Labels
Workflow labels: `user-story`, `technical-task`, `needs-approval`, `ai-authored`

Area labels (add to technical task issues alongside `technical-task`):
<!-- Define area labels here as feature areas emerge, e.g. `area:logging`, `area:insights`, `area:db` -->

## Data safety
Local user data is **THE HIGHEST-STAKES** concern. **NEVER** write a schema migration without a corresponding data integrity test. **ALWAYS** read the `expo-sqlite-migration` skill before touching the database.
