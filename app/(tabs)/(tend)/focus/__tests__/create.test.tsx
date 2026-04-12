/**
 * Component tests for the Create Focus screen.
 *
 * Mocks expo-router, the DB module, and query functions so the screen can
 * be rendered in Jest/Node without a device or expo-sqlite.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import type { Label } from '@/lib/db/query-types';

// ─── mocks (must be declared before module import) ────────────────────────────

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

const mockCreateFocus = jest.fn();
const mockSearchLabelsAcross = jest.fn();
jest.mock('@/lib/db/queries', () => ({
  createFocus: (...args: unknown[]) => mockCreateFocus(...args),
  searchLabelsAcross: (...args: unknown[]) => mockSearchLabelsAcross(...args),
}));

// ─── fixtures ─────────────────────────────────────────────────────────────────

function makeLabel(id: number, name: string, entryTypeId = 1): Label {
  return { id, entryTypeId, name, parentId: null, categoryId: null, categoryName: null, sortOrder: id * 10 };
}

const LABEL_A = makeLabel(1, 'Oats');
const LABEL_B = makeLabel(2, 'Running', 6);

// ─── import screen after mocks ────────────────────────────────────────────────
// eslint-disable-next-line import/first
import CreateFocusScreen from '../create';

describe('CreateFocusScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSearchLabelsAcross.mockResolvedValue([LABEL_A, LABEL_B]);
    mockCreateFocus.mockResolvedValue({ id: 42, name: 'My Focus', archived: false, sortOrder: 0, createdAt: '' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── 1. Renders required fields ────────────────────────────────────────────

  it('renders the name input and label search', () => {
    const { getByTestId } = render(<CreateFocusScreen />);
    expect(getByTestId('focus-name-input')).toBeTruthy();
    expect(getByTestId('focus-label-search')).toBeTruthy();
  });

  // ── 2. Save button absent when name is empty ──────────────────────────────

  it('does not render the save button when name is empty', () => {
    const { queryByTestId } = render(<CreateFocusScreen />);
    expect(queryByTestId('focus-save-button')).toBeNull();
  });

  // ── 3. Save button present when name is non-empty ─────────────────────────

  it('renders the save button when name has text', () => {
    const { getByTestId } = render(<CreateFocusScreen />);
    fireEvent.changeText(getByTestId('focus-name-input'), 'My Focus');
    expect(getByTestId('focus-save-button')).toBeTruthy();
  });

  // ── 4. Save calls createFocus with correct name and label IDs ─────────────

  it('calls createFocus with the typed name and selected label IDs on save', async () => {
    const { getByTestId } = render(<CreateFocusScreen />);

    // Type a name
    fireEvent.changeText(getByTestId('focus-name-input'), 'My Focus');

    // Type in label search to trigger suggestions
    fireEvent.changeText(getByTestId('focus-label-search'), 'O');

    // Advance timer so suggestions fetch fires
    await act(async () => {
      jest.runAllTimers();
    });

    // Select a suggestion chip
    await waitFor(() => getByTestId(`focus-suggestion-${LABEL_A.id}`));
    fireEvent.press(getByTestId(`focus-suggestion-${LABEL_A.id}`));

    // Press save
    await act(async () => {
      fireEvent.press(getByTestId('focus-save-button'));
    });

    await waitFor(() => {
      expect(mockCreateFocus).toHaveBeenCalledWith(
        expect.anything(),
        { name: 'My Focus', labelIds: [LABEL_A.id] }
      );
    });
  });

  // ── 5. After successful save, router.back() is called ────────────────────

  it('calls router.back() after a successful save', async () => {
    const { getByTestId } = render(<CreateFocusScreen />);
    fireEvent.changeText(getByTestId('focus-name-input'), 'New Focus');

    await act(async () => {
      fireEvent.press(getByTestId('focus-save-button'));
    });

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  // ── 6. Save button disappears when name is cleared ────────────────────────

  it('hides the save button again when name is cleared', () => {
    const { getByTestId, queryByTestId } = render(<CreateFocusScreen />);
    fireEvent.changeText(getByTestId('focus-name-input'), 'Hello');
    expect(getByTestId('focus-save-button')).toBeTruthy();
    fireEvent.changeText(getByTestId('focus-name-input'), '');
    expect(queryByTestId('focus-save-button')).toBeNull();
  });
});
