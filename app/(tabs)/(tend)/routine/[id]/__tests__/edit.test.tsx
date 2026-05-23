/**
 * Component tests for the Edit Routine screen.
 *
 * Mocks expo-router, the DB module, and query functions so the screen can
 * be rendered in Jest/Node without a device or expo-sqlite.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import type { EntryType, Routine, RoutineItem } from '@/lib/db/query-types';

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
const mockUpdateRoutine = jest.fn();
const mockReplaceRoutineItems = jest.fn();
const mockSetRoutineArchived = jest.fn();
const mockGetEntryTypes = jest.fn();
jest.mock('@/lib/db/queries', () => ({
  getRoutines: (...args: unknown[]) => mockGetRoutines(...args),
  getRoutineItems: (...args: unknown[]) => mockGetRoutineItems(...args),
  updateRoutine: (...args: unknown[]) => mockUpdateRoutine(...args),
  replaceRoutineItems: (...args: unknown[]) => mockReplaceRoutineItems(...args),
  setRoutineArchived: (...args: unknown[]) => mockSetRoutineArchived(...args),
  getEntryTypes: (...args: unknown[]) => mockGetEntryTypes(...args),
}));

// FocusDropdown uses useFocuses hook — provide a stub
jest.mock('@/hooks/useFocuses', () => ({
  useFocuses: () => ({ focuses: [], loading: false }),
}));

// ─── fixtures ─────────────────────────────────────────────────────────────────

function makeEntryType(id: number, name: string, title: string): EntryType {
  return { id, name, title, icon: null, prompt: null, measurementType: 'label_select' };
}

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
    timeBlocks: ['Morning', 'Evening'],
    ...overrides,
  };
}

function makeRoutineItem(id: number, name: string, entryTypeId: number): RoutineItem {
  return {
    id,
    routineId: 42,
    name,
    entryTypeId,
    entryTypeName: 'Food',
    entryTypeTitle: 'Food',
    prescribedDetail: null,
    instructionNote: null,
    sortOrder: 0,
    labelIds: [],
  };
}

const ENTRY_TYPE_FOOD = makeEntryType(1, 'Food', 'Food');
const ENTRY_TYPE_ACTIVITY = makeEntryType(6, 'Activity', 'Activity');
const ROUTINE = makeRoutine();
const ROUTINE_ITEM = makeRoutineItem(1, 'Breakfast', 1);

// eslint-disable-next-line import/first
import EditRoutineScreen from '../edit';

describe('EditRoutineScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRoutines.mockResolvedValue([ROUTINE]);
    mockGetRoutineItems.mockResolvedValue([ROUTINE_ITEM]);
    mockGetEntryTypes.mockResolvedValue([ENTRY_TYPE_FOOD, ENTRY_TYPE_ACTIVITY]);
    mockUpdateRoutine.mockResolvedValue(undefined);
    mockReplaceRoutineItems.mockResolvedValue(undefined);
    mockSetRoutineArchived.mockResolvedValue(undefined);
  });

  // ── 1. Name input pre-filled ──────────────────────────────────────────────

  it('pre-fills name input from loaded routine', async () => {
    const { getByTestId } = render(<EditRoutineScreen />);
    await waitFor(() => {
      expect(getByTestId('routine-edit-name-input').props.value).toBe('Morning Routine');
    });
  });

  // ── 2. Time blocks pre-selected ───────────────────────────────────────────

  it('pre-selects time blocks from loaded routine', async () => {
    const { getByTestId } = render(<EditRoutineScreen />);
    await waitFor(() => {
      expect(getByTestId('routine-edit-time-block-Morning').props.accessibilityState?.selected).toBe(true);
      expect(getByTestId('routine-edit-time-block-Evening').props.accessibilityState?.selected).toBe(true);
      expect(getByTestId('routine-edit-time-block-Midday').props.accessibilityState?.selected).toBe(false);
    });
  });

  // ── 3. Items list pre-populated ───────────────────────────────────────────

  it('pre-populates items list from getRoutineItems', async () => {
    const { getByTestId } = render(<EditRoutineScreen />);
    await waitFor(() => {
      expect(getByTestId('routine-edit-item-0-name-input').props.value).toBe('Breakfast');
    });
  });

  // ── 4. Save button absent when name is cleared ────────────────────────────

  it('hides save button when name is cleared', async () => {
    const { getByTestId, queryByTestId } = render(<EditRoutineScreen />);
    await waitFor(() => getByTestId('routine-edit-name-input'));

    fireEvent.changeText(getByTestId('routine-edit-name-input'), '');
    expect(queryByTestId('routine-edit-save-button')).toBeNull();
  });

  // ── 5. Save calls updateRoutine with correct patch ────────────────────────

  it('calls updateRoutine with correct patch on save', async () => {
    const { getByTestId } = render(<EditRoutineScreen />);
    await waitFor(() => getByTestId('routine-edit-save-button'));

    fireEvent.changeText(getByTestId('routine-edit-name-input'), 'Updated Routine');

    await act(async () => {
      fireEvent.press(getByTestId('routine-edit-save-button'));
    });

    await waitFor(() => {
      expect(mockUpdateRoutine).toHaveBeenCalledWith(
        expect.anything(),
        42,
        expect.objectContaining({ name: 'Updated Routine' })
      );
    });
  });

  // ── 6. Save calls replaceRoutineItems with correct items ──────────────────

  it('calls replaceRoutineItems with current items array on save', async () => {
    const { getByTestId } = render(<EditRoutineScreen />);
    await waitFor(() => getByTestId('routine-edit-save-button'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-edit-save-button'));
    });

    await waitFor(() => {
      expect(mockReplaceRoutineItems).toHaveBeenCalledWith(
        expect.anything(),
        42,
        expect.arrayContaining([
          expect.objectContaining({ name: 'Breakfast', entryTypeId: 1 }),
        ])
      );
    });
  });

  // ── 7. router.back() after successful save ────────────────────────────────

  it('calls router.back() after successful save', async () => {
    const { getByTestId } = render(<EditRoutineScreen />);
    await waitFor(() => getByTestId('routine-edit-save-button'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-edit-save-button'));
    });

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  // ── 8. Error shown when updateRoutine throws ──────────────────────────────

  it('shows error message when updateRoutine throws', async () => {
    mockUpdateRoutine.mockRejectedValue(new Error('DB error'));
    const { getByTestId, getByText } = render(<EditRoutineScreen />);
    await waitFor(() => getByTestId('routine-edit-save-button'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-edit-save-button'));
    });

    await waitFor(() => {
      expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
    });
  });

  // ── 9. Archive button calls setRoutineArchived then router.back() ─────────

  it('archive button calls setRoutineArchived(db, id, true) then router.back()', async () => {
    const { getByTestId } = render(<EditRoutineScreen />);
    await waitFor(() => getByTestId('routine-edit-archive-button'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-edit-archive-button'));
    });

    await waitFor(() => {
      expect(mockSetRoutineArchived).toHaveBeenCalledWith(expect.anything(), 42, true);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  // ── 10. Frequency note pre-filled from loaded routine ────────────────────

  it('pre-fills frequency note from loaded routine', async () => {
    mockGetRoutines.mockResolvedValue([makeRoutine({ frequencyNote: '3x daily' })]);
    const { getByTestId } = render(<EditRoutineScreen />);
    await waitFor(() => {
      expect(getByTestId('routine-edit-frequency-note').props.value).toBe('3x daily');
    });
  });

  // ── 11. Load error displayed when getRoutines throws ─────────────────────

  it('shows load error message when data fetch fails', async () => {
    mockGetRoutines.mockRejectedValue(new Error('DB error'));
    const { getByTestId } = render(<EditRoutineScreen />);
    await waitFor(() => {
      expect(getByTestId('routine-edit-load-error')).toBeTruthy();
    });
  });

  // ── 12. Archive error shown when setRoutineArchived throws ────────────────

  it('shows archive error when setRoutineArchived throws', async () => {
    mockSetRoutineArchived.mockRejectedValue(new Error('DB error'));
    const { getByTestId, getByText } = render(<EditRoutineScreen />);
    await waitFor(() => getByTestId('routine-edit-archive-button'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-edit-archive-button'));
    });

    await waitFor(() => {
      expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
    });
  });
});
