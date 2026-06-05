// Next-unblocked task resolver for the milestone-autonomy pipeline (#170).
// Pure, dependency-free, deterministic — no Claude, no API calls.
// See docs/plans/170-milestone-pipeline-stage1.md and the milestone-autonomy spec.

/**
 * Resolve the next task the pipeline should pick up, or null if it should STOP.
 *
 * A task is eligible when:
 *   1. its milestone status === "approved", and
 *   2. every id in depends_on has status === "done", and
 *   3. its own status === "todo".
 * Returns the lowest-ordered eligible task. Returns null to serialize (some task
 * in an approved milestone is already in-progress or blocked-on-human) or when
 * nothing is eligible (→ caller notifies "milestone complete").
 *
 * @param {{ milestones: {id:string,status:string}[], tasks: {id:string,milestone:string,depends_on:string[],status:string}[] }} dag
 * @returns {object|null}
 */
export function nextTask(dag) {
  const approved = new Set(
    dag.milestones.filter((m) => m.status === 'approved').map((m) => m.id)
  );
  const active = dag.tasks.filter((t) => approved.has(t.milestone));

  // Serialize: one ticket at a time within the approved set.
  if (active.some((t) => t.status === 'in-progress' || t.status === 'blocked-on-human')) {
    return null;
  }

  const done = new Set(dag.tasks.filter((t) => t.status === 'done').map((t) => t.id));

  return (
    active.find(
      (t) => t.status === 'todo' && t.depends_on.every((dep) => done.has(dep))
    ) ?? null
  );
}

// CLI entry: prints the next task id (or empty line) for the workflow to consume.
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('node:fs');
  const path = process.argv[2] ?? 'docs/tasks.json';
  const dag = JSON.parse(fs.readFileSync(path, 'utf8'));
  const next = nextTask(dag);
  process.stdout.write(next ? `${next.id}\n` : '\n');
}
