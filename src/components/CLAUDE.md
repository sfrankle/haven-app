# Components

Read `docs/design/CLAUDE.md` before making any UI, copy, or interaction decisions.

**Before simplifying, reviewing, or changing any component**, read:

- `docs/design/interaction.md` — canonical rules for chip behaviour (flat, flat+severity, hierarchical), navigation structure, back-button scenarios, tab-bar visibility, and spacing rhythm. Do not infer these from the code or general React Native conventions — the spec is authoritative.
- `docs/design/visual-style.md` — colour tokens, typography (Philosopher), motion
- `.claude/design-guidance.md` — Claude-specific frontend guidance

If a component's behaviour looks unusual (e.g. submit button disappears instead of disabling, back always returns to Tend home, chip taps remove rather than toggle), check `interaction.md` before assuming it is a bug.