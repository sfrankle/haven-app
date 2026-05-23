/**
 * Component tests for the Create Routine screen.
 *
 * Mocks expo-router, the DB module, and query functions so the screen can
 * be rendered in Jest/Node without a device or expo-sqlite.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import type { EntryType } from '@/lib/db/query-types';

// ─── mocks (must be declared before module import) ────────────────────────────

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

const mockCreateRoutine = jest.fn();
const mockCreateRoutineItems = jest.fn();
const mockGetEntryTypes = jest.fn();
jest.mock('@/lib/db/queries', () => ({
  createRoutine: (...args: unknown[]) => mockCreateRoutine(...args),
  createRoutineItems: (...args: unknown[]) => mockCreateRoutineItems(...args),
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

const ENTRY_TYPE_FOOD = makeEntryType(1, 'Food', 'Food');
const ENTRY_TYPE_ACTIVITY = makeEntryType(6, 'Activity', 'Activity');

// eslint-disable-next-line import/first
import CreateRoutineScreen from '../create';

describe('CreateRoutineScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEntryTypes.mockResolvedValue([ENTRY_TYPE_FOOD, ENTRY_TYPE_ACTIVITY]);
    mockCreateRoutine.mockResolvedValue({
      id: 10,
      name: 'Morning Routine',
      associatedFocusId: null,
      frequencyNote: null,
      sortOrder: 0,
      archived: false,
      createdAt: '',
      updatedAt: '',
      timeBlocks: [],
    });
    mockCreateRoutineItems.mockResolvedValue(undefined);
  });

  // ── 1. Renders required fields ────────────────────────────────────────────

  it('renders name input, time block chips, and add item button', async () => {
    const { getByTestId } = render(<CreateRoutineScreen />);
    expect(getByTestId('routine-name-input')).toBeTruthy();
    // Time block chips
    await waitFor(() => {
      expect(getByTestId('routine-time-block-Morning')).toBeTruthy();
      expect(getByTestId('routine-time-block-Midday')).toBeTruthy();
      expect(getByTestId('routine-time-block-Afternoon')).toBeTruthy();
      expect(getByTestId('routine-time-block-Evening')).toBeTruthy();
    });
    expect(getByTestId('routine-add-item-button')).toBeTruthy();
  });

  // ── 2. Save button absent when name is empty ──────────────────────────────

  it('does not render the save button when name is empty', () => {
    const { queryByTestId } = render(<CreateRoutineScreen />);
    expect(queryByTestId('routine-save-button')).toBeNull();
  });

  // ── 3. Save button present when name is non-empty and all items are valid ─

  it('renders the save button when name is non-empty and no items', () => {
    const { getByTestId } = render(<CreateRoutineScreen />);
    fireEvent.changeText(getByTestId('routine-name-input'), 'My Routine');
    expect(getByTestId('routine-save-button')).toBeTruthy();
  });

  // ── 4. Save button absent when item has empty name ────────────────────────

  it('hides save button when an item has an empty name', async () => {
    const { getByTestId, queryByTestId } = render(<CreateRoutineScreen />);
    fireEvent.changeText(getByTestId('routine-name-input'), 'My Routine');

    // Add an item (starts with empty name)
    fireEvent.press(getByTestId('routine-add-item-button'));

    // Entry type chips load async; wait for them and select one so only name is invalid
    await waitFor(() => getByTestId('routine-item-0-entry-type-1'));
    fireEvent.press(getByTestId('routine-item-0-entry-type-1'));

    // name is still empty → save should be absent
    expect(queryByTestId('routine-save-button')).toBeNull();
  });

  // ── 5. Save button absent when item has no entry type ─────────────────────

  it('hides save button when an item has no entry type selected', async () => {
    const { getByTestId, queryByTestId } = render(<CreateRoutineScreen />);
    fireEvent.changeText(getByTestId('routine-name-input'), 'My Routine');
    fireEvent.press(getByTestId('routine-add-item-button'));

    // Fill in name but don't pick entry type
    await waitFor(() => getByTestId('routine-item-0-name-input'));
    fireEvent.changeText(getByTestId('routine-item-0-name-input'), 'Item name');

    // No entry type selected → save absent
    expect(queryByTestId('routine-save-button')).toBeNull();
  });

  // ── 6. Time block chip toggles on/off ─────────────────────────────────────

  it('toggles a time block chip on then off', async () => {
    const { getByTestId } = render(<CreateRoutineScreen />);
    const chip = getByTestId('routine-time-block-Morning');

    // Initially not selected — accessible state false
    expect(chip.props.accessibilityState?.selected).toBe(false);

    fireEvent.press(chip);
    expect(chip.props.accessibilityState?.selected).toBe(true);

    fireEvent.press(chip);
    expect(chip.props.accessibilityState?.selected).toBe(false);
  });

  // ── 7. Add item appends a blank item row ──────────────────────────────────

  it('appends a new blank item row when Add Item is pressed', async () => {
    const { getByTestId, queryByTestId } = render(<CreateRoutineScreen />);

    expect(queryByTestId('routine-item-0-name-input')).toBeNull();
    fireEvent.press(getByTestId('routine-add-item-button'));
    await waitFor(() => getByTestId('routine-item-0-name-input'));
    expect(getByTestId('routine-item-0-name-input')).toBeTruthy();
  });

  // ── 8. Removing an item removes it from the list ──────────────────────────

  it('removes item when remove button is pressed', async () => {
    const { getByTestId, queryByTestId } = render(<CreateRoutineScreen />);
    fireEvent.press(getByTestId('routine-add-item-button'));
    await waitFor(() => getByTestId('routine-item-0-remove-button'));

    fireEvent.press(getByTestId('routine-item-0-remove-button'));
    expect(queryByTestId('routine-item-0-name-input')).toBeNull();
  });

  // ── 9. Up/down reorder buttons move items ─────────────────────────────────

  it('up/down buttons reorder items correctly', async () => {
    const { getByTestId } = render(<CreateRoutineScreen />);

    // Add two items
    fireEvent.press(getByTestId('routine-add-item-button'));
    await waitFor(() => getByTestId('routine-item-0-name-input'));
    fireEvent.changeText(getByTestId('routine-item-0-name-input'), 'Alpha');

    fireEvent.press(getByTestId('routine-add-item-button'));
    await waitFor(() => getByTestId('routine-item-1-name-input'));
    fireEvent.changeText(getByTestId('routine-item-1-name-input'), 'Beta');

    // Move Beta up
    fireEvent.press(getByTestId('routine-item-1-up-button'));

    // Now item-0 should be Beta
    await waitFor(() => {
      expect(getByTestId('routine-item-0-name-input').props.value).toBe('Beta');
      expect(getByTestId('routine-item-1-name-input').props.value).toBe('Alpha');
    });
  });

  // ── 10. createRoutine called with correct args ────────────────────────────

  it('calls createRoutine with name, selected timeBlocks, and associatedFocusId', async () => {
    const { getByTestId } = render(<CreateRoutineScreen />);
    fireEvent.changeText(getByTestId('routine-name-input'), 'Morning Routine');
    fireEvent.press(getByTestId('routine-time-block-Morning'));
    fireEvent.press(getByTestId('routine-time-block-Evening'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-save-button'));
    });

    await waitFor(() => {
      expect(mockCreateRoutine).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Morning Routine',
          timeBlocks: expect.arrayContaining(['Morning', 'Evening']),
        })
      );
    });
  });

  // ── 11. createRoutineItems called after createRoutine with items ──────────

  it('calls createRoutineItems with correct items after createRoutine', async () => {
    const { getByTestId } = render(<CreateRoutineScreen />);
    fireEvent.changeText(getByTestId('routine-name-input'), 'Routine');

    // Add an item
    fireEvent.press(getByTestId('routine-add-item-button'));
    await waitFor(() => getByTestId('routine-item-0-name-input'));
    fireEvent.changeText(getByTestId('routine-item-0-name-input'), 'Breakfast');

    // Select entry type
    await waitFor(() => getByTestId('routine-item-0-entry-type-1'));
    fireEvent.press(getByTestId('routine-item-0-entry-type-1'));

    await act(async () => {
      fireEvent.press(getByTestId('routine-save-button'));
    });

    await waitFor(() => {
      expect(mockCreateRoutineItems).toHaveBeenCalledWith(
        expect.anything(),
        10, // routineId returned by mockCreateRoutine
        expect.arrayContaining([
          expect.objectContaining({ name: 'Breakfast', entryTypeId: 1 }),
        ])
      );
    });
  });

  // ── 12. router.back() called on successful save ───────────────────────────

  it('calls router.back() after successful save', async () => {
    const { getByTestId } = render(<CreateRoutineScreen />);
    fireEvent.changeText(getByTestId('routine-name-input'), 'Routine');

    await act(async () => {
      fireEvent.press(getByTestId('routine-save-button'));
    });

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  // ── 13. Frequency note passed to createRoutine when filled ───────────────

  it('passes frequencyNote to createRoutine when filled in', async () => {
    const { getByTestId } = render(<CreateRoutineScreen />);
    fireEvent.changeText(getByTestId('routine-name-input'), 'Morning Routine');
    fireEvent.changeText(getByTestId('routine-frequency-note'), '3x daily');

    await act(async () => {
      fireEvent.press(getByTestId('routine-save-button'));
    });

    await waitFor(() => {
      expect(mockCreateRoutine).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ frequencyNote: '3x daily' })
      );
    });
  });

  // ── 14. Error shown when createRoutine throws ─────────────────────────────

  it('shows error message when createRoutine throws', async () => {
    mockCreateRoutine.mockRejectedValue(new Error('DB error'));
    const { getByTestId, getByText } = render(<CreateRoutineScreen />);
    fireEvent.changeText(getByTestId('routine-name-input'), 'Routine');

    await act(async () => {
      fireEvent.press(getByTestId('routine-save-button'));
    });

    await waitFor(() => {
      expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
    });
  });
});
