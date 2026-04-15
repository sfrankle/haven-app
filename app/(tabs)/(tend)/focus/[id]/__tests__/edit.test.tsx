import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import type { Label } from '@/lib/db/query-types';
import type { FocusItem } from '@/lib/db/query-types';

// ─── mocks (must be declared before module import) ────────────────────────────

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({ id: '42' }),
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

const mockGetFocuses = jest.fn();
const mockGetFocusItems = jest.fn();
const mockUpdateFocus = jest.fn();
const mockSetFocusArchived = jest.fn();
const mockSearchLabelsAcross = jest.fn();
jest.mock('@/lib/db/queries', () => ({
  getFocuses: (...args: unknown[]) => mockGetFocuses(...args),
  getFocusItems: (...args: unknown[]) => mockGetFocusItems(...args),
  updateFocus: (...args: unknown[]) => mockUpdateFocus(...args),
  setFocusArchived: (...args: unknown[]) => mockSetFocusArchived(...args),
  searchLabelsAcross: (...args: unknown[]) => mockSearchLabelsAcross(...args),
}));

// ─── fixtures ─────────────────────────────────────────────────────────────────

function makeLabel(id: number, name: string, entryTypeId = 1): Label {
  return { id, entryTypeId, name, parentId: null, categoryId: null, categoryName: null, sortOrder: id * 10 };
}

function makeFocusItem(labelId: number, labelName: string, source: 'pinned' | 'historical'): FocusItem {
  return { labelId, labelName, entryTypeId: 1, entryTypeName: 'food', entryTypeTitle: 'Food', source };
}

const FOCUS = { id: 42, name: 'Morning Routine', description: null, archived: false, sortOrder: 0, createdAt: '' };
const PINNED_ITEM = makeFocusItem(1, 'Oats', 'pinned');
const HISTORICAL_ITEM = makeFocusItem(2, 'Coffee', 'historical');
const LABEL_A = makeLabel(3, 'Banana');

// eslint-disable-next-line import/first
import EditFocusScreen from '../edit';

describe('EditFocusScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetFocuses.mockResolvedValue([FOCUS]);
    mockGetFocusItems.mockResolvedValue([PINNED_ITEM, HISTORICAL_ITEM]);
    mockUpdateFocus.mockResolvedValue(undefined);
    mockSetFocusArchived.mockResolvedValue(undefined);
    mockSearchLabelsAcross.mockResolvedValue([LABEL_A]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── 1. Renders name input pre-filled with focus name ──────────────────────

  it('renders name input pre-filled with focus name', async () => {
    const { getByTestId } = render(<EditFocusScreen />);
    await waitFor(() => {
      expect(getByTestId('focus-edit-name-input').props.value).toBe('Morning Routine');
    });
  });

  // ── 2. Renders pinned label chips ─────────────────────────────────────────

  it('renders pinned label chips', async () => {
    const { getByText } = render(<EditFocusScreen />);
    await waitFor(() => {
      expect(getByText('Oats')).toBeTruthy();
    });
  });

  // ── 3. Save button hidden when name is cleared ────────────────────────────

  it('hides save button when name is cleared', async () => {
    const { getByTestId, queryByTestId } = render(<EditFocusScreen />);
    await waitFor(() => getByTestId('focus-edit-name-input'));
    fireEvent.changeText(getByTestId('focus-edit-name-input'), '');
    expect(queryByTestId('focus-edit-save-button')).toBeNull();
  });

  // ── 4. Save calls updateFocus with new name and chip label IDs ────────────

  it('calls updateFocus with updated name and label IDs on save', async () => {
    const { getByTestId } = render(<EditFocusScreen />);
    await waitFor(() => getByTestId('focus-edit-name-input'));

    fireEvent.changeText(getByTestId('focus-edit-name-input'), 'Updated Name');

    await act(async () => {
      fireEvent.press(getByTestId('focus-edit-save-button'));
    });

    await waitFor(() => {
      expect(mockUpdateFocus).toHaveBeenCalledWith(
        expect.anything(),
        42,
        { name: 'Updated Name', labelIds: [PINNED_ITEM.labelId] }
      );
    });
  });

  // ── 5. After save, router.back() is called ───────────────────────────────

  it('calls router.back() after successful save', async () => {
    const { getByTestId } = render(<EditFocusScreen />);
    await waitFor(() => getByTestId('focus-edit-save-button'));

    await act(async () => {
      fireEvent.press(getByTestId('focus-edit-save-button'));
    });

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  // ── 6. Shows error when updateFocus throws (duplicate name) ───────────────

  it('shows error message when updateFocus throws', async () => {
    mockUpdateFocus.mockRejectedValue(new Error('UNIQUE constraint failed'));
    const { getByTestId, getByText } = render(<EditFocusScreen />);
    await waitFor(() => getByTestId('focus-edit-save-button'));

    await act(async () => {
      fireEvent.press(getByTestId('focus-edit-save-button'));
    });

    await waitFor(() => {
      expect(getByText('A Focus with that name already exists.')).toBeTruthy();
    });
  });

  // ── 7. Archive button calls setFocusArchived then router.back() ───────────

  it('archive button calls setFocusArchived with true then router.back()', async () => {
    const { getByTestId } = render(<EditFocusScreen />);
    await waitFor(() => getByTestId('focus-edit-archive-button'));

    await act(async () => {
      fireEvent.press(getByTestId('focus-edit-archive-button'));
    });

    await waitFor(() => {
      expect(mockSetFocusArchived).toHaveBeenCalledWith(expect.anything(), 42, true);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  // ── 8. Historical labels render as read-only chips ────────────────────────

  it('renders historical labels as read-only chips', async () => {
    const { getByTestId } = render(<EditFocusScreen />);
    await waitFor(() => {
      expect(getByTestId(`focus-edit-historical-label-${HISTORICAL_ITEM.labelId}`)).toBeTruthy();
    });
  });
});
