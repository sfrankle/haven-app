# Changelog

One row per PR. Most recent at the top.

| PR | Description | Date |
|----|-------------|------|
| [#171](https://github.com/sfrankle/haven-app/pull/171) | Complete a Routine screen: checklist with static prescribed detail, batch entry creation on submit, unchecked items skipped, Focus auto-association, and 29 unit tests | 2026-05-24 |
| [#168](https://github.com/sfrankle/haven-app/pull/168) | Create and edit Routine screens: shared form, reorderable items (name, entry type, labels, prescribed detail), time-block multi-select, and archive option | 2026-05-23 |
| [#167](https://github.com/sfrankle/haven-app/pull/167) | Routine data layer: `ScheduleableBlock` type, six query functions, `useRoutines` and `useRoutineCompletionStates` hooks, and 37 unit tests covering all completion state logic | 2026-05-22 |
| [#166](https://github.com/sfrankle/haven-app/pull/166) | Routine schema migration (v9): adds five Routine tables and two nullable FK columns on `entry` with data integrity tests | 2026-05-22 |
| [#159](https://github.com/sfrankle/haven-app/pull/159) | Added `TimeBlock` type and `getTimeBlock()` utility with confirmed four-block windows (Morning/Midday/Afternoon/Evening); resolved the Midday vs Afternoon open question in the Routines spec | 2026-05-22 |
| [#158](https://github.com/sfrankle/haven-app/pull/158) | Focus polish: keyboard avoidance on FocusDropdown and Notes fields, severity 0 in Quick-Log, long-press Focus pill to edit/archive, Attune scroll fix, Trace filter reset on tab re-tap, Show Context view mode, and Settings visual hierarchy | 2026-05-22 |
| [#155](https://github.com/sfrankle/haven-app/pull/155) | Physical severity scale extended to include 0 ("absent"), so users can log zero-symptom check-ins and Trace displays "(absent)" for those chips | 2026-04-17 |
| [#153](https://github.com/sfrankle/haven-app/pull/153) | Focus quick-log screen: tap a Focus pill on Tend to log all tracked items in one submission | 2026-04-16 |
| [#151](https://github.com/sfrankle/haven-app/pull/151) | Edit and archive Focus: rename, add/remove pinned labels, archive from Tend or Settings; archived Focuses can be unarchived from Settings | 2026-04-15 |
| [#150](https://github.com/sfrankle/haven-app/pull/150) | `FocusDropdown` now shows an inline error when focus creation fails (e.g. duplicate name) instead of silently leaving the modal open | 2026-04-15 |
| [#148](https://github.com/sfrankle/haven-app/pull/148) | Focus field added to all six log screens via `LogFormShell`; new `FocusDropdown` and `ChipTray` components extracted | 2026-04-14 |
| [#147](https://github.com/sfrankle/haven-app/pull/147) | Focus filter in Trace: filter control narrows entry list by Focus (active or archived), with clear affordance to restore unfiltered view | 2026-04-14 |
| [#146](https://github.com/sfrankle/haven-app/pull/146) | Focus pills row on Tend dashboard: named focus pills and \"+ Add Focus\" pill displayed above the entry grid | 2026-04-13 |
| [#145](https://github.com/sfrankle/haven-app/pull/145) | Create Focus screen: name field, label picker, \"+ Add Focus\" pill on Tend, and Maestro flow test | 2026-04-12 |
| [#144](https://github.com/sfrankle/haven-app/pull/144) | Focus data layer: `Focus`/`FocusLabel`/`FocusItem` types, six query functions, `saveEntry` focus association, and `useFocuses` hook with 24 tests | 2026-04-12 |
| [#143](https://github.com/sfrankle/haven-app/pull/143) | Focus schema migration (v8): adds `focus`, `focus_label`, and `entry_focus` tables with FK constraints and 11 data integrity tests | 2026-04-10 |
| [#142](https://github.com/sfrankle/haven-app/pull/142) | `LogFormShell` centralises submit state, Notes field, and save feedback across all six log screens; fixes duplicate-entry bug by guarding the save button while a write is in flight | 2026-04-10 |
| [#109](https://github.com/sfrankle/haven-app/pull/109) | Milestone 2 polish: error feedback on all log and trace screens, shared SaveErrorMessage component, copy aligned with voice guide | 2026-03-29 |
| [#108](https://github.com/sfrankle/haven-app/pull/108) | 1 - Core Logging bug fixes. | 2026-03-27 |
| [#106](https://github.com/sfrankle/haven-app/pull/106) | GitHub Actions workflow to build a sideloadable Android APK and attach it to a GitHub Release on `v*` tag push | 2026-03-27 |
| [#104](https://github.com/sfrankle/haven-app/pull/104) | Unit tests for `colorForActivityLabel` — covers category color and fallback paths | 2026-03-26 |
| [#103](https://github.com/sfrankle/haven-app/pull/103) | Trace screen — chronological entry history with date grouping, per-type summaries, and inline expand/collapse | 2026-03-26 |
| [#102](https://github.com/sfrankle/haven-app/pull/102) | Physical (Attune) logging screen — energy slider, state search with severity chips, area-prefixed chip labels, multi-entry save to SQLite | 2026-03-25 |
| [#99](https://github.com/sfrankle/haven-app/pull/99) | Emotion (Unveil) logging flow — 3-screen split-pane Tier-1 → Tier-2 → Tier-3 hierarchy, single-chip selection, save to SQLite | 2026-03-25 |
| [#98](https://github.com/sfrankle/haven-app/pull/98) | Food (Nourish) logging screen — flat chip selection, meal context label, food category chip colours, custom food creation, save to SQLite | 2026-03-24 |
| [#97](https://github.com/sfrankle/haven-app/pull/97) | Tab bar icons and entry type tile icons replaced with MaterialCommunityIcons | 2026-03-16 |
| [#95](https://github.com/sfrankle/haven-app/pull/95) | Activity (Journey) logging screen — search, category-coloured chips, custom activity creation, save to SQLite | 2026-03-14 |
| [#94](https://github.com/sfrankle/haven-app/pull/94) | Hydration (Replenish) logging screen — oz input, running daily total, save to SQLite, confirmation dismiss | 2026-03-12 |
| [#93](https://github.com/sfrankle/haven-app/pull/93) | Sleep (Slumber) logging screen — hours input, optional notes, save to SQLite, confirmation dismiss | 2026-03-12 |
| [#91](https://github.com/sfrankle/haven-app/pull/91) | Tend home screen — entry type grid with date header and navigation to each entry type | 2026-03-12 |
| [#90](https://github.com/sfrankle/haven-app/pull/90) | Shared logging UI components — Chip, SearchBar, NumericInput, SaveConfirmation | 2026-03-12 |
| [#89](https://github.com/sfrankle/haven-app/pull/89) | DB query layer — entry types, labels, save entry, trace entries, daily hydration total | 2026-03-11 |
| [#88](https://github.com/sfrankle/haven-app/pull/88) | Privacy notice on Settings screen | 2026-03-10 |
| [#87](https://github.com/sfrankle/haven-app/pull/87) | Timestamp utility — local ISO capture and display formatting | 2026-03-09 |
| [#70](https://github.com/sfrankle/haven-app/pull/70) | Base component library — Screen, Surface, Button; `@/` path alias | 2026-03-07 |
| [#65](https://github.com/sfrankle/haven-app/pull/65) | Seed default vocabulary — entry types, categories, ~200 labels, label-tag associations | 2026-03-05 |
| [#64](https://github.com/sfrankle/haven-app/pull/64) | SQLite schema and migration infrastructure | 2026-03-04 |
| [#63](https://github.com/sfrankle/haven-app/pull/63) | Design system tokens — colors, typography, spacing, Philosopher + Lexend fonts | 2026-03-04 |
| [#62](https://github.com/sfrankle/haven-app/pull/62) | Project scaffold — Expo SDK 55, TypeScript, Expo Router, five-tab shell | 2026-03-04 |
