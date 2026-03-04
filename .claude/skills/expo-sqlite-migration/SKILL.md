---
name: expo-sqlite-migration
description: Use when any database schema change is needed (adding/removing/renaming columns or tables, adding seed data) to ensure user data is never lost
---

When a schema change is needed, follow these steps in order:

1. **Identify the change** — which table/column is being added, removed, or renamed?

2. **Increment the schema version** in your database initialization file.

3. **Write an additive migration** using `ALTER TABLE` or `CREATE TABLE IF NOT EXISTS`:
   - Never drop and recreate a table as a migration shortcut — write the proper migration
   - Never use destructive migration fallbacks — user data must survive every upgrade
   - If removing a column is necessary, do a table rename → new table create → data copy → old table drop cycle

4. **Seed / default data check** — if inserting new default rows, always use `INSERT OR IGNORE` to never overwrite existing user data

5. **Write a migration test before running the migration in production:**
   - Start from a database at version N with known data
   - Run the migration to version N+1
   - Assert the schema is correct AND the original data is intact
   - Assert no user rows were deleted, overwritten, or corrupted

6. **Commit a schema snapshot** — export the current schema as a JSON or SQL file in `docs/schema/` so migrations are reviewable in diffs

7. **Run all migration tests** and confirm they pass before opening the PR

### Data Safety Rules (non-negotiable)
- User data must survive every schema migration, no exceptions
- New columns must have sensible defaults so existing rows remain valid
- Seed/default data inserts must always be `INSERT OR IGNORE`
- Every migration must have a corresponding test that verifies data integrity
