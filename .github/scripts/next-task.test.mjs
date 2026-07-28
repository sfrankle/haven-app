import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextTask } from './next-task.mjs';

const milestone = (over = {}) => ({ id: 'm', title: 'M', status: 'approved', ...over });
const task = (over = {}) => ({ id: 't', milestone: 'm', depends_on: [], status: 'todo', ...over });

test('returns the lowest-ordered eligible todo task', () => {
  const dag = {
    milestones: [milestone()],
    tasks: [task({ id: 'a' }), task({ id: 'b' })],
  };
  assert.equal(nextTask(dag)?.id, 'a');
});

test('skips tasks whose milestone is not approved', () => {
  const dag = {
    milestones: [milestone({ id: 'm', status: 'draft' })],
    tasks: [task({ id: 'a' })],
  };
  assert.equal(nextTask(dag), null);
});

test('skips a task with an unmet dependency, picks the next eligible one', () => {
  const dag = {
    milestones: [milestone()],
    tasks: [
      task({ id: 'a', depends_on: ['x'], status: 'todo' }),
      task({ id: 'x', status: 'todo' }),
    ],
  };
  // 'a' is blocked by 'x' (todo, not done); 'x' itself is eligible.
  assert.equal(nextTask(dag)?.id, 'x');
});

test('returns a task once all its dependencies are done', () => {
  const dag = {
    milestones: [milestone()],
    tasks: [
      task({ id: 'a', depends_on: ['x'], status: 'todo' }),
      task({ id: 'x', status: 'done' }),
    ],
  };
  assert.equal(nextTask(dag)?.id, 'a');
});

test('serializes: returns null if any task is in-progress', () => {
  const dag = {
    milestones: [milestone()],
    tasks: [task({ id: 'a', status: 'in-progress' }), task({ id: 'b', status: 'todo' })],
  };
  assert.equal(nextTask(dag), null);
});

test('serializes: returns null if any task is blocked-on-human', () => {
  const dag = {
    milestones: [milestone()],
    tasks: [task({ id: 'a', status: 'blocked-on-human' }), task({ id: 'b', status: 'todo' })],
  };
  assert.equal(nextTask(dag), null);
});

test('returns null when every task in the approved milestone is done', () => {
  const dag = {
    milestones: [milestone()],
    tasks: [task({ id: 'a', status: 'done' }), task({ id: 'b', status: 'done' })],
  };
  assert.equal(nextTask(dag), null);
});

test('does not block on in-progress/blocked tasks in a different (draft) milestone', () => {
  const dag = {
    milestones: [milestone({ id: 'm1', status: 'approved' }), milestone({ id: 'm2', status: 'draft' })],
    tasks: [
      task({ id: 'a', milestone: 'm2', status: 'in-progress' }),
      task({ id: 'b', milestone: 'm1', status: 'todo' }),
    ],
  };
  // The in-progress task is in a non-approved milestone — not in the active set — so it doesn't serialize.
  assert.equal(nextTask(dag)?.id, 'b');
});
