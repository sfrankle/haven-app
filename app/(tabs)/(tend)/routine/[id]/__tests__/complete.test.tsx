/**
 * Component tests for the Complete Routine screen.
 *
 * Mocks expo-router, the DB module, and query functions so the screen can
 * be rendered in Jest/Node without a device or expo-sqlite.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import type { Routine, RoutineItem } from '@/lib/db/query-types';

// ─── mocks (must be declared before module import) ────────────────────────────

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ id: '42' }),
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

const mockGetRoutines = jest.fn();
const mockGetRoutineItems = jest.fn();
const mockCompleteRoutine = jest.fn();
jest.mock('@/lib/db/queries', () => ({
  getRoutines: (...args: unknown[]) => mockGetRoutines(...args),
  getRoutineItems: (...args: unknown[]) => mockGetRoutineItems(...args),
  completeRoutine: (...args: unknown[]) => mockCompleteRoutine(...args),
}));

// ─── fixtures ─────────────────────────────────────────────────────────────────

function makeRoutine(overrides?: Partial<Routine>): Routine {
  return {
    id: 42,
    name: 'Morning Routine',
    associatedFocusId: null,
    frequencyNote: null,
    sortOrder: 0,
    archived: false,
    createdAt: '2026-05-01T09:00:00-07:00',
    updatedAt: '2026-05-01T09:00:00-07:00',
    timeBlocks: ['Morning'],
    ...overrides,
  };
}

function makeRoutineItem(id: number, name: string, overrides?: Partial<RoutineItem>): RoutineItem {
  return {
    id,
    routineId: 42,
    name,
    entryTypeId: 1,
    entryTypeName: 'Food',
    entryTypeTitle: 'Food',
    prescribedDetail: null,
    instructionNote: null,
    sortOrder: id - 1,
    labelIds: [],
    ...overrides,
  };
}

const ROUTINE = makeRoutine();
const ITEM_A = makeRoutineItem(1, 'Breakfast');
const ITEM_B = makeRoutineItem(2, 'Morning walk', { entryTypeId: 6, entryTypeName: 'Activity', entryTypeTitle: 'Activity' });
const ITEM_WITH_DETAIL = makeRoutineItem(3, 'Vitamins', { prescribedDetail: 'Take 2 capsules' });
const ITEM_WITH_NOTE = makeRoutineItem(4, 'Stretch', { instructionNote: 'Hold each stretch for 30s' });

// eslint-disable-next-line import/first
import CompleteRoutineScreen from '../complete';

describe('CompleteRoutineScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRoutines.mockResolvedValue([ROUTINE]);
    mockGetRoutineItems.mockResolvedValue([ITEM_A, ITEM_B]);
    mockCompleteRoutine.mockResolvedValue(1);
  });

  // ── 1. Items rendered from getRoutineItems ────────────────────────────────

  it('renders item names loaded from getRoutineItems', async () => {
    const { getByText } = render(<CompleteRoutineScreen />);
    await waitFor(() => {
      expect(getByText('Breakfast')).toBeTruthy();
      expect(getByText('Morning walk')).toBeTruthy();
    });
  });

  it('shows prescribed detail as static text when present', async () => {
    mockGetRoutineItems.mockResolvedValue([ITEM_WITH_DETAIL]);
    const { getByText } = render(<CompleteRoutineScreen />);
    await waitFor(() => {
      expect(getByText('Take 2 capsules')).toBeTruthy();
    });
  });

  // ── 2. All items checked by default ──────────────────────────────────────

  it('all items are checked by default', async () => {
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => {
      expect(getByTestId('routine-complete-item-0-checkbox').props.accessibilityState?.checked).toBe(true);
      expect(getByTestId('routine-complete-item-1-checkbox').props.accessibilityState?.checked).toBe(true);
    });
  });

  // ── 3. Unchecking an item ─────────────────────────────────────────────────

  it('unchecking an item marks it unchecked', async () => {
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => getByTestId('routine-complete-item-0-checkbox'));

    fireEvent.press(getByTestId('routine-complete-item-0-checkbox'));

    await waitFor(() => {
      expect(getByTestId('routine-complete-item-0-checkbox').props.accessibilityState?.checked).toBe(false);
    });
  });

  // ── 4. Submit calls completeRoutine with correct shape ────────────────────

  it('calls completeRoutine with correct routineId, associatedFocusId, and all checked items', async () => {
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => getByTestId('routine-complete-submit-button'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-complete-submit-button'));
    });

    await waitFor(() => {
      expect(mockCompleteRoutine).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          routineId: 42,
          associatedFocusId: null,
          checkedItems: expect.arrayContaining([
            expect.objectContaining({ entryTypeId: ITEM_A.entryTypeId }),
            expect.objectContaining({ entryTypeId: ITEM_B.entryTypeId }),
          ]),
        })
      );
    });
  });

  // ── 5. Unchecked items excluded from completeRoutine call ─────────────────

  it('excludes unchecked items from completeRoutine call', async () => {
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => getByTestId('routine-complete-item-0-checkbox'));

    fireEvent.press(getByTestId('routine-complete-item-0-checkbox'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-complete-submit-button'));
    });

    await waitFor(() => {
      const call = mockCompleteRoutine.mock.calls[0][1] as { checkedItems: { entryTypeId: number }[] };
      expect(call.checkedItems).toHaveLength(1);
      expect(call.checkedItems[0].entryTypeId).toBe(ITEM_B.entryTypeId);
    });
  });

  // ── 6. Notes field propagated ─────────────────────────────────────────────

  it('passes notes value to completeRoutine on submit', async () => {
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => getByTestId('routine-complete-notes-input'));

    fireEvent.changeText(getByTestId('routine-complete-notes-input'), 'Felt great');

    await act(async () => {
      fireEvent.press(getByTestId('routine-complete-submit-button'));
    });

    await waitFor(() => {
      expect(mockCompleteRoutine).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ notes: 'Felt great' })
      );
    });
  });

  it('passes null notes when notes field is empty', async () => {
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => getByTestId('routine-complete-submit-button'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-complete-submit-button'));
    });

    await waitFor(() => {
      expect(mockCompleteRoutine).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ notes: null })
      );
    });
  });

  // ── 7. Focus association passed when routine has associatedFocusId ─────────

  it('passes associatedFocusId when routine has one', async () => {
    mockGetRoutines.mockResolvedValue([makeRoutine({ associatedFocusId: 5 })]);
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => getByTestId('routine-complete-submit-button'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-complete-submit-button'));
    });

    await waitFor(() => {
      expect(mockCompleteRoutine).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ associatedFocusId: 5 })
      );
    });
  });

  // ── 8. No focus association when routine.associatedFocusId is null ─────────

  it('passes associatedFocusId: null when routine has no focus', async () => {
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => getByTestId('routine-complete-submit-button'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-complete-submit-button'));
    });

    await waitFor(() => {
      expect(mockCompleteRoutine).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ associatedFocusId: null })
      );
    });
  });

  // ── 9. router.back() called after successful submit ───────────────────────

  it('shows saved confirmation and calls router.back() after successful submit', async () => {
    jest.useFakeTimers();
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => getByTestId('routine-complete-submit-button'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-complete-submit-button'));
    });

    // Confirmation should appear immediately
    await waitFor(() => expect(getByTestId('routine-complete-saved')).toBeTruthy());
    expect(mockBack).not.toHaveBeenCalled();

    // Advance past the 800ms delay
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(mockBack).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  // ── 10. Error shown when completeRoutine throws ───────────────────────────

  it('shows submit error text when completeRoutine rejects', async () => {
    mockCompleteRoutine.mockRejectedValue(new Error('DB error'));
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => getByTestId('routine-complete-submit-button'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-complete-submit-button'));
    });

    await waitFor(() => {
      expect(getByTestId('routine-complete-submit-error')).toBeTruthy();
    });
  });

  // ── 11. Submit button disabled while submitting ───────────────────────────

  it('disables submit button while submission is in progress', async () => {
    mockCompleteRoutine.mockImplementation(() => new Promise(() => {})); // never resolves
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => getByTestId('routine-complete-submit-button'));

    fireEvent.press(getByTestId('routine-complete-submit-button'));

    await waitFor(() => {
      expect(getByTestId('routine-complete-submit-button').props.accessibilityState?.disabled).toBe(true);
    });
  });

  // ── 12. Load error shown when getRoutineItems throws ─────────────────────

  it('shows load error when getRoutineItems rejects', async () => {
    mockGetRoutineItems.mockRejectedValue(new Error('DB error'));
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => {
      expect(getByTestId('routine-complete-load-error')).toBeTruthy();
    });
  });

  it('shows load error when routine is not found in fetched list', async () => {
    mockGetRoutines.mockResolvedValue([]); // resolves but no matching routine
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => {
      expect(getByTestId('routine-complete-load-error')).toBeTruthy();
    });
  });

  it('shows go-back button in load error state', async () => {
    mockGetRoutineItems.mockRejectedValue(new Error('DB error'));
    const { getByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => {
      expect(getByTestId('routine-complete-go-back')).toBeTruthy();
    });
  });

  // ── 13. Instruction note hidden by default, revealed on expand ────────────

  it('hides instruction note by default and shows it after tapping expand', async () => {
    mockGetRoutineItems.mockResolvedValue([ITEM_WITH_NOTE]);
    const { getByTestId, queryByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => getByTestId('routine-complete-item-0-expand-button'));

    // Note should not be visible initially
    expect(queryByTestId('routine-complete-item-0-instruction-note')).toBeNull();

    // Tap expand button
    fireEvent.press(getByTestId('routine-complete-item-0-expand-button'));

    await waitFor(() => {
      expect(getByTestId('routine-complete-item-0-instruction-note')).toBeTruthy();
    });
  });

  it('does not render expand button when item has no instructionNote', async () => {
    const { queryByTestId } = render(<CompleteRoutineScreen />);
    await waitFor(() => {
      expect(queryByTestId('routine-complete-item-0-expand-button')).toBeNull();
    });
  });
});
