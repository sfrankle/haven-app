# Changelog

One row per PR. Most recent at the top.

| PR | Description | Date |
|----|-------------|------|
| #91 | feat: Tend home screen — entry type grid; `EntryTypeTile` component, `useEntryTypes` hook, 2-column FlatList with date header and navigation; seed `sort_order` and FA5 icon names updated; `@expo/vector-icons` added | 2026-03-12 |
| #90 | feat: shared logging UI components — Chip (default + severity variants, useChipColors hook), SearchBar (controlled, autofocus, clear button), NumericInput (numeric keyboard, unit suffix), SaveConfirmation (animated toast, auto-dismiss, pointerEvents none) | 2026-03-12 |
| #89 | feat: DB query layer — `queries.ts` with `getEntryTypes`, `getLabels` (recents + prefix search), `saveEntry` (transactional), `getEntriesForTrace`, `getDailyHydrationTotal`; `query-types.ts` for app-facing shapes; `BetterSqliteAdapter` for Jest; fix missing `title` on `EntryTypeRow` | 2026-03-11 |
| #87 | feat: timestamp utility — `nowLocalIso()` captures wall-clock time with UTC offset; `formatEntryTime()` and `formatEntryDate()` display stored time without re-interpreting in current timezone | 2026-03-09 |
| #88 | feat: add privacy notice to Settings screen — "Your data is stored only on this device." styled with bodyMedium/chrome tokens; Jest render tests; Maestro flow test | 2026-03-10 |
| #70 | feat: base component library — Screen (safe-area + background-warm fill), Surface (token-based card), Button (primary/secondary variants, disabled state, 48dp touch target); wire Screen into all tab screens; add barrel exports; move src layout under src/ with @/ path alias | 2026-03-07 |
| #65 | feat: seed default vocabulary — measurement types, entry types, categories, 16 tags, ~200 labels (food, emotion, physical state, activity), label_tag associations; idempotent via INSERT OR IGNORE with explicit IDs; refactor seed/schema SQL to versioned .sql files; improve DB tests: add FK structural invariants, remove brittle count assertions, enable foreign_keys pragma | 2026-03-05 |
| #64 | feat: implement SQLite schema and migration infrastructure — 12-table schema, custom migration runner using user_version pragma, schema integrity tests with better-sqlite3, TypeScript row types | 2026-03-04 |
| #63 | feat: implement design system tokens (colors, typography, spacing) with local Philosopher + Lexend fonts and expo-font splash-screen loading | 2026-03-04 |
| #62 | feat: scaffold Expo SDK 55 + TypeScript project with Expo Router tab navigation shell (five tabs: Tend, Trace, Weave, Anchor, Settings) | 2026-03-04 |