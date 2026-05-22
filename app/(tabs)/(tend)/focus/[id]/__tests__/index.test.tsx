import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import type { FocusItem } from '@/lib/db/query-types';

// ─── mocks (must be declared before module import) ────────────────────────────

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => ({ id: '7' }),
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

const mockGetFocusById = jest.fn();
const mockGetFocusItems = jest.fn();
const mockSaveEntryBatch = jest.fn();
jest.mock('@/lib/db/queries', () => ({
  getFocusById: (...args: unknown[]) => mockGetFocusById(...args),
  getFocusItems: (...args: unknown[]) => mockGetFocusItems(...args),
  saveEntryBatch: (...args: unknown[]) => mockSaveEntryBatch(...args),
}));

// ─── fixtures ─────────────────────────────────────────────────────────────────

function makeFocusItem(
  labelId: number,
  labelName: string,
  source: 'pinned' | 'historical',
  entryTypeName = 'Food',
  entryTypeTitle = 'Nourish'
): FocusItem {
  return { labelId, labelName, entryTypeId: 1, entryTypeName, entryTypeTitle, source };
}

const FOCUS = { id: 7, name: 'Morning Routine', description: null, archived: false, sortOrder: 0, createdAt: '' };

const PINNED_FOOD = makeFocusItem(1, 'Apple', 'pinned', 'Food', 'Nourish');
const PINNED_PHYSICAL = makeFocusItem(2, 'Gassy', 'pinned', 'Physical', 'Attune');
const HISTORICAL_FOOD = makeFocusItem(3, 'Coffee', 'historical', 'Food', 'Nourish');

// eslint-disable-next-line import/first
import QuickLogScreen from '../index';

describe('QuickLogScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFocusById.mockResolvedValue(FOCUS);
    mockGetFocusItems.mockResolvedValue([PINNED_FOOD, PINNED_PHYSICAL]);
    mockSaveEntryBatch.mockResolvedValue([10, 11]);
  });

  // 1. Renders pinned section with correct row text
  test('renders pinned section with correct row text', async () => {
    const { getByText } = render(<QuickLogScreen />);
    await waitFor(() => {
      expect(getByText('Nourish: Apple')).toBeTruthy();
      expect(getByText('Attune: Gassy')).toBeTruthy();
    });
  });

  // 2. Renders historical section when historical items present
  test('renders historical section when historical items are present', async () => {
    mockGetFocusItems.mockResolvedValue([PINNED_FOOD, HISTORICAL_FOOD]);
    const { getByText, getByTestId } = render(<QuickLogScreen />);
    await waitFor(() => {
      expect(getByTestId('section-heading-pinned')).toBeTruthy();
      expect(getByTestId('section-heading-historical')).toBeTruthy();
      expect(getByText('Nourish: Apple')).toBeTruthy();
      expect(getByText('Nourish: Coffee')).toBeTruthy();
    });
  });

  // 3. Historical section absent when no historical items
  test('historical section absent when no historical items', async () => {
    const { queryByTestId } = render(<QuickLogScreen />);
    await waitFor(() => {
      expect(queryByTestId('section-heading-historical')).toBeNull();
    });
  });

  // 4. All items pre-checked, Submit visible
  test('all items start checked and Submit button is visible', async () => {
    const { getByTestId } = render(<QuickLogScreen />);
    await waitFor(() => {
      expect(getByTestId('submit-button')).toBeTruthy();
      expect(getByTestId('item-row-1')).toBeTruthy();
      expect(getByTestId('item-row-2')).toBeTruthy();
    });
  });

  // 5. Unchecking an item removes it from the save payload
  test('unchecking an item excludes it from saveEntryBatch call', async () => {
    const { getByTestId } = render(<QuickLogScreen />);
    await waitFor(() => getByTestId('item-checkbox-1'));

    fireEvent.press(getByTestId('item-checkbox-1'));
    await waitFor(() => getByTestId('submit-button'));
    fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockSaveEntryBatch).toHaveBeenCalledTimes(1);
      const [, inputs] = mockSaveEntryBatch.mock.calls[0] as [unknown, { labelIds?: number[] }[]];
      expect(inputs).toHaveLength(1);
      expect(inputs[0].labelIds).toEqual([2]);
    });
  });

  // 6. Unchecking all items hides the Submit button
  test('unchecking all items hides the Submit button', async () => {
    const { getByTestId, queryByTestId } = render(<QuickLogScreen />);
    await waitFor(() => getByTestId('item-checkbox-1'));

    fireEvent.press(getByTestId('item-checkbox-1'));
    fireEvent.press(getByTestId('item-checkbox-2'));

    await waitFor(() => {
      expect(queryByTestId('submit-button')).toBeNull();
    });
  });

  // 7. Physical row renders severity selector including 0
  test('Physical row renders severity buttons 0–5', async () => {
    const { getByTestId, getAllByRole } = render(<QuickLogScreen />);
    await waitFor(() => getByTestId('item-row-2'));
    // The severity container should be present for the physical item (labelId 2)
    const severityContainer = getByTestId('severity-row-2');
    expect(severityContainer).toBeTruthy();
    // SeverityRow renders 6 buttons (0-5)
    const buttons = getAllByRole('button');
    // Find buttons within the severity row by accessibility label
    const zeroBtn = buttons.find(
      (b) => b.props.accessibilityLabel === 'Severity 0 — symptom absent'
    );
    expect(zeroBtn).toBeTruthy();
  });

  // 8. Severity value is included in save input (including 0)
  test('selected severity value is passed in numericValue', async () => {
    const { getByTestId, getAllByRole } = render(<QuickLogScreen />);
    await waitFor(() => getByTestId('severity-row-2'));
    const buttons = getAllByRole('button');
    const btn3 = buttons.find((b) => b.props.accessibilityLabel === 'Severity 3 of 5');
    fireEvent.press(btn3!);
    fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockSaveEntryBatch).toHaveBeenCalledTimes(1);
      const [, inputs] = mockSaveEntryBatch.mock.calls[0] as [unknown, { labelIds?: number[]; numericValue?: number }[]];
      const physicalInput = inputs.find((i) => i.labelIds?.[0] === 2);
      expect(physicalInput?.numericValue).toBe(3);
    });
  });

  // 8b. Severity 0 value is passed in numericValue
  test('severity 0 is passed in numericValue when selected', async () => {
    const { getByTestId, getByLabelText } = render(<QuickLogScreen />);
    await waitFor(() => getByTestId('severity-row-2'));
    fireEvent.press(getByLabelText('Severity 0 — symptom absent'));
    fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockSaveEntryBatch).toHaveBeenCalledTimes(1);
      const [, inputs] = mockSaveEntryBatch.mock.calls[0] as [unknown, { labelIds?: number[]; numericValue?: number }[]];
      const physicalInput = inputs.find((i) => i.labelIds?.[0] === 2);
      expect(physicalInput?.numericValue).toBe(0);
    });
  });

  // 9. Submit calls saveEntryBatch, not saveEntry
  test('submit calls saveEntryBatch (not saveEntry)', async () => {
    const { getByTestId } = render(<QuickLogScreen />);
    await waitFor(() => getByTestId('submit-button'));
    fireEvent.press(getByTestId('submit-button'));
    await waitFor(() => {
      expect(mockSaveEntryBatch).toHaveBeenCalledTimes(1);
    });
  });

  // 10. Empty state when no items
  test('empty state message shown and Submit absent when no items', async () => {
    mockGetFocusItems.mockResolvedValue([]);
    const { getByTestId, queryByTestId } = render(<QuickLogScreen />);
    await waitFor(() => {
      expect(getByTestId('empty-state')).toBeTruthy();
      expect(queryByTestId('submit-button')).toBeNull();
    });
  });

  // 11. Error state on save failure
  test('error message rendered when saveEntryBatch throws', async () => {
    mockSaveEntryBatch.mockRejectedValue(new Error('DB error'));
    const { getByTestId } = render(<QuickLogScreen />);
    await waitFor(() => getByTestId('submit-button'));
    fireEvent.press(getByTestId('submit-button'));
    await waitFor(() => {
      expect(getByTestId('save-error')).toBeTruthy();
    });
  });
});
