import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RoutineSection } from '../RoutineSection';
import type { Routine, RoutineCompletionState, RoutineDayProgress } from '@/lib/db/query-types';
import type { ScheduleableBlock } from '@/lib/utils/timestamp';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  // Faithful to the real hook: the callback runs once per focus, not once per
  // render. Invoking it on every render would loop forever, because the
  // section's focus callback bumps a refresh counter.
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const react = require('react') as typeof import('react');
    react.useEffect(cb, [cb]);
  },
}));

// Pin the time block so grouping is deterministic regardless of when the
// suite runs. Everything else in the timestamp module stays real.
jest.mock('@/lib/utils/timestamp', () => ({
  ...jest.requireActual('@/lib/utils/timestamp'),
  getTimeBlock: jest.fn(() => 'Morning'),
}));

jest.mock('@/hooks/useRoutines', () => ({
  useRoutines: jest.fn(),
}));

jest.mock('@/hooks/useRoutineCompletionStates', () => ({
  useRoutineCompletionStates: jest.fn(),
}));

jest.mock('@/hooks/useRoutineDayProgress', () => ({
  useRoutineDayProgress: jest.fn(),
}));

// eslint-disable-next-line import/first
import { getTimeBlock } from '@/lib/utils/timestamp';
// eslint-disable-next-line import/first
import { useRoutines } from '@/hooks/useRoutines';
// eslint-disable-next-line import/first
import { useRoutineCompletionStates } from '@/hooks/useRoutineCompletionStates';
// eslint-disable-next-line import/first
import { useRoutineDayProgress } from '@/hooks/useRoutineDayProgress';

const mockGetTimeBlock = jest.mocked(getTimeBlock);
const mockUseRoutines = jest.mocked(useRoutines);
const mockUseStates = jest.mocked(useRoutineCompletionStates);
const mockUseProgress = jest.mocked(useRoutineDayProgress);

// ─── fixtures ────────────────────────────────────────────────────────────────

function makeRoutine(
  id: number,
  name: string,
  timeBlocks: ScheduleableBlock[],
  overrides: Partial<Routine> = {}
): Routine {
  return {
    id,
    name,
    associatedFocusId: null,
    frequencyNote: null,
    sortOrder: id,
    archived: false,
    createdAt: '2026-05-22T09:00:00-07:00',
    updatedAt: '2026-05-22T09:00:00-07:00',
    timeBlocks,
    ...overrides,
  };
}

function setup(opts: {
  routines?: Routine[];
  loading?: boolean;
  states?: Record<number, RoutineCompletionState>;
  statesError?: Error | null;
  progress?: Record<number, RoutineDayProgress>;
}) {
  mockUseRoutines.mockReturnValue({
    routines: opts.routines ?? [],
    loading: opts.loading ?? false,
    error: null,
  });
  mockUseStates.mockReturnValue({
    states: opts.states ?? {},
    loading: false,
    error: opts.statesError ?? null,
  });
  mockUseProgress.mockReturnValue({
    progress: opts.progress ?? {},
    loading: false,
    error: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Restored per test — the Night cases override it.
  mockGetTimeBlock.mockReturnValue('Morning');
});

// ─── empty state ─────────────────────────────────────────────────────────────

describe('RoutineSection — no Routines', () => {
  it('shows only the add row', () => {
    setup({ routines: [] });
    const { getByTestId, queryByTestId } = render(<RoutineSection />);

    expect(getByTestId('routine-section-add-button')).toBeTruthy();
    expect(queryByTestId('routine-section-disclosure')).toBeNull();
  });

  it('navigates to the create screen when the add row is pressed', () => {
    setup({ routines: [] });
    const { getByTestId } = render(<RoutineSection />);

    fireEvent.press(getByTestId('routine-section-add-button'));
    expect(mockPush).toHaveBeenCalledWith('/routine/create');
  });
});

// ─── archived ────────────────────────────────────────────────────────────────

describe('RoutineSection — archived Routines', () => {
  it('never renders a card for an archived Routine', () => {
    const active = makeRoutine(1, 'Morning Flow', ['Morning']);
    const archived = makeRoutine(2, 'Old Habit', ['Morning'], { archived: true });
    setup({
      routines: [active, archived],
      states: { 1: 'due', 2: 'due' },
    });

    const { getByTestId, queryByTestId, queryByText } = render(<RoutineSection />);

    expect(getByTestId('routine-card-1')).toBeTruthy();
    expect(queryByTestId('routine-card-2')).toBeNull();
    expect(queryByText('Old Habit')).toBeNull();
  });
});

// ─── due-now card ────────────────────────────────────────────────────────────

describe('RoutineSection — due now', () => {
  it('renders the name, configured blocks, and progress on the card', () => {
    const routine = makeRoutine(1, 'Morning Flow', ['Morning', 'Afternoon']);
    setup({
      routines: [routine],
      states: { 1: 'due' },
      progress: { 1: { completionCount: 1, completedBlocks: ['Morning'] } },
    });

    const { getByTestId, getByText } = render(<RoutineSection />);

    expect(getByTestId('routine-card-1')).toBeTruthy();
    expect(getByText('Morning Flow')).toBeTruthy();
    expect(getByText('Morning · Afternoon')).toBeTruthy();
    expect(getByText('1 of 2 · Morning done')).toBeTruthy();
  });

  it('renders "Anytime" for a Routine with no configured blocks', () => {
    const routine = makeRoutine(1, 'Stretch', []);
    setup({ routines: [routine], states: { 1: 'due' } });

    const { getByText } = render(<RoutineSection />);
    expect(getByText('Anytime')).toBeTruthy();
  });

  it('opens the complete flow when the card is pressed', () => {
    const routine = makeRoutine(7, 'Morning Flow', ['Morning']);
    setup({ routines: [routine], states: { 7: 'due' } });

    const { getByTestId } = render(<RoutineSection />);
    fireEvent.press(getByTestId('routine-card-7'));

    expect(mockPush).toHaveBeenCalledWith('/routine/7/complete');
  });
});

// ─── disclosure ──────────────────────────────────────────────────────────────

describe('RoutineSection — disclosure row', () => {
  const completed = makeRoutine(1, 'Morning Flow', ['Morning']);
  const later = makeRoutine(2, 'Wind Down', ['Evening']);

  function setupBoth() {
    setup({
      routines: [completed, later],
      states: { 1: 'fully_done', 2: 'due' },
      progress: { 1: { completionCount: 1, completedBlocks: ['Morning'] } },
    });
  }

  it('is collapsed by default and hides both Routines', () => {
    setupBoth();
    const { getByTestId, queryByTestId } = render(<RoutineSection />);

    expect(getByTestId('routine-section-disclosure')).toBeTruthy();
    expect(queryByTestId('routine-collapsed-row-1')).toBeNull();
    expect(queryByTestId('routine-collapsed-row-2')).toBeNull();
  });

  it('labels both groups when both are populated', () => {
    setupBoth();
    const { getByText } = render(<RoutineSection />);
    expect(getByText('Completed · Later')).toBeTruthy();
  });

  it('reveals both Routines when pressed, with progress on the completed one', () => {
    setupBoth();
    const { getByTestId, getByText } = render(<RoutineSection />);

    fireEvent.press(getByTestId('routine-section-disclosure'));

    expect(getByTestId('routine-collapsed-row-1')).toBeTruthy();
    expect(getByTestId('routine-collapsed-row-2')).toBeTruthy();
    expect(getByText('1 of 1 · Morning done')).toBeTruthy();
  });

  it('collapses again when pressed a second time', () => {
    setupBoth();
    const { getByTestId, queryByTestId } = render(<RoutineSection />);

    fireEvent.press(getByTestId('routine-section-disclosure'));
    expect(getByTestId('routine-collapsed-row-1')).toBeTruthy();

    fireEvent.press(getByTestId('routine-section-disclosure'));
    expect(queryByTestId('routine-collapsed-row-1')).toBeNull();
  });

  it('lets a later Routine be completed early from the expanded list', () => {
    setupBoth();
    const { getByTestId } = render(<RoutineSection />);

    fireEvent.press(getByTestId('routine-section-disclosure'));
    fireEvent.press(getByTestId('routine-collapsed-row-2'));

    expect(mockPush).toHaveBeenCalledWith('/routine/2/complete');
  });

  it('labels the completed group alone', () => {
    setup({ routines: [completed], states: { 1: 'fully_done' } });
    const { getByText } = render(<RoutineSection />);
    expect(getByText('Completed')).toBeTruthy();
  });

  it('labels the later group alone', () => {
    setup({ routines: [later], states: { 2: 'due' } });
    const { getByText } = render(<RoutineSection />);
    expect(getByText('Later')).toBeTruthy();
  });

  it('is absent entirely when every Routine is due now', () => {
    const due = makeRoutine(3, 'Morning Flow', ['Morning']);
    setup({ routines: [due], states: { 3: 'due' } });

    const { queryByTestId } = render(<RoutineSection />);
    expect(queryByTestId('routine-section-disclosure')).toBeNull();
  });
});

// ─── loading and error ───────────────────────────────────────────────────────

describe('RoutineSection — loading and failure', () => {
  it('shows the add row and no cards while loading', () => {
    setup({
      routines: [makeRoutine(1, 'Morning Flow', ['Morning'])],
      loading: true,
      states: { 1: 'due' },
    });

    const { getByTestId, queryByTestId } = render(<RoutineSection />);
    expect(getByTestId('routine-section-add-button')).toBeTruthy();
    expect(queryByTestId('routine-card-1')).toBeNull();
    expect(queryByTestId('routine-section-disclosure')).toBeNull();
  });

  it('degrades quietly to the add row when the completion state read fails', () => {
    setup({
      routines: [makeRoutine(1, 'Morning Flow', ['Morning'])],
      states: {},
      statesError: new Error('db failed'),
    });

    const { getByTestId, queryByTestId } = render(<RoutineSection />);
    expect(getByTestId('routine-section-add-button')).toBeTruthy();
    // No state means no due card — the Routine falls back into the disclosure.
    expect(queryByTestId('routine-card-1')).toBeNull();
  });
});

// ─── Night ───────────────────────────────────────────────────────────────────

describe('RoutineSection — Night', () => {
  it('asks for completion state against Evening, the nearest scheduleable block', () => {
    // getRoutineCompletionState only accepts a ScheduleableBlock, and Night is
    // not one. Passing Night through would be a type error at best and a
    // missing window at worst.
    mockGetTimeBlock.mockReturnValue('Night');
    setup({ routines: [makeRoutine(1, 'Wind Down', ['Evening'])], states: { 1: 'due' } });

    render(<RoutineSection />);

    expect(mockUseStates).toHaveBeenCalledWith(
      expect.anything(),
      'Evening',
      expect.any(String)
    );
  });

  it('still shows an earlier-block Routine as due at night, never as missed', () => {
    // Night sorts last, so every configured block has already started. A
    // Morning Routine not yet done is simply still available.
    mockGetTimeBlock.mockReturnValue('Night');
    setup({ routines: [makeRoutine(1, 'Morning Flow', ['Morning'])], states: { 1: 'due' } });

    const { getByTestId, queryByTestId } = render(<RoutineSection />);
    expect(getByTestId('routine-card-1')).toBeTruthy();
    expect(queryByTestId('routine-section-disclosure')).toBeNull();
  });
});
