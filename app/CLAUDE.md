
## Testing Philosophy

**Principle:** Test user flows, not lines of code. Every user-facing behavior should have a flow test. We do not track line coverage.

**Flow tests (E2E):**
- Use Maestro — declarative YAML flows that map to user-facing behavior
- Organized by feature/flow in the codebase, not by issue number
- Each technical task PR must include or update flow tests for any user-facing behavior it touches
- When a feature changes an existing flow, update the existing flow test — don't add a parallel one

**Data integrity tests:**
- Every schema migration must have a test (see `expo-sqlite-migration` skill)
- Tests must verify: schema is correct after migration AND original user data is intact
- Data safety is non-negotiable — corrupting local user data is the worst possible outcome

**Unit/integration tests:**
- Use Jest + React Native Testing Library for component and business logic tests
- Required for any non-trivial logic (calculations, transformations, state management)

**TDD:**
- Claude invokes **`superpowers:test-driven-development`** before writing implementation code
