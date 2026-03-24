import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import type { EntryType, Label } from '@/lib/db/query-types';
import { useEntryTypes } from '@/hooks';
import * as queries from '@/lib/db/queries';
import * as timestamp from '@/lib/utils/timestamp';

// Must be hoisted before module evaluation.
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: mockBack, push: jest.fn() }),
}));

jest.mock('@/hooks', () => ({
  useEntryTypes: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  getLabels: jest.fn(),
  saveEntry: jest.fn(),
  createLabel: jest.fn(),
}));

jest.mock('@/lib/utils/timestamp', () => ({
  nowLocalIso: jest.fn(),
  getMealContext: jest.fn(),
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

// Declared after jest.mock; hoisting keeps mocks available at module level.
const mockBack = jest.fn();

const FOOD_ENTRY_TYPE: EntryType = {
  id: 3,
  name: 'Food',
  title: 'Nourish',
  icon: 'food-apple',
  prompt: 'What did you eat?',
  measurementType: 'label_select',
};

const FIXTURE_ENTRY_TYPES: EntryType[] = [FOOD_ENTRY_TYPE];

const FIXED_ISO = '2026-03-14T08:00:00-07:00';

function makeLabel(id: number, name: string, categoryName = 'Grains'): Label {
  return {
    id,
    entryTypeId: 3,
    name,
    parentId: null,
    categoryId: 1,
    categoryName,
    sortOrder: id * 10,
  };
}

const OATS_LABEL = makeLabel(1, 'Oats', 'Grains');
const EGGS_LABEL = makeLabel(2, 'Eggs', 'Protein');

// Import screen after mocks are set up.
// eslint-disable-next-line import/first
import LogFoodScreen from '../../../app/(tabs)/(tend)/log/food';

describe('LogFoodScreen', () => {
  const mockUseEntryTypes = jest.mocked(useEntryTypes);
  const mockGetLabels = jest.mocked(queries.getLabels);
  const mockSaveEntry = jest.mocked(queries.saveEntry);
  const mockCreateLabel = jest.mocked(queries.createLabel);
  const mockNowLocalIso = jest.mocked(timestamp.nowLocalIso);
  const mockGetMealContext = jest.mocked(timestamp.getMealContext);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseEntryTypes.mockReturnValue({
      entryTypes: FIXTURE_ENTRY_TYPES,
      loading: false,
      error: null,
    });
    mockGetLabels.mockResolvedValue([OATS_LABEL, EGGS_LABEL]);
    mockSaveEntry.mockResolvedValue(1);
    mockCreateLabel.mockResolvedValue({
      id: 99,
      entryTypeId: 3,
      name: 'ZzCustomFood99',
      parentId: null,
      categoryId: null,
      categoryName: null,
      sortOrder: 0,
    });
    mockNowLocalIso.mockReturnValue(FIXED_ISO);
    mockGetMealContext.mockReturnValue('Breakfast');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the entry type prompt', async () => {
    const { getByText } = render(<LogFoodScreen />);
    await waitFor(() => expect(getByText('What did you eat?')).toBeTruthy());
  });

  it('renders the meal context label', async () => {
    const { getByText } = render(<LogFoodScreen />);
    await waitFor(() => expect(getByText('Breakfast')).toBeTruthy());
  });

  it('SearchBar has autoFocus enabled', () => {
    const { getByTestId } = render(<LogFoodScreen />);
    const input = getByTestId('food-search');
    expect(input.props.autoFocus).toBe(true);
  });

  it('calls getLabels with search term and limit after typing', async () => {
    const { getByTestId } = render(<LogFoodScreen />);
    fireEvent.changeText(getByTestId('food-search'), 'oat');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() =>
      expect(mockGetLabels).toHaveBeenCalledWith(
        expect.anything(),
        FOOD_ENTRY_TYPE.id,
        expect.objectContaining({ search: 'oat', limit: 5 })
      )
    );
  });

  it('calls getLabels with limit but no search when search is empty', async () => {
    const { getByTestId } = render(<LogFoodScreen />);
    fireEvent.changeText(getByTestId('food-search'), '');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() =>
      expect(mockGetLabels).toHaveBeenCalledWith(
        expect.anything(),
        FOOD_ENTRY_TYPE.id,
        expect.not.objectContaining({ search: expect.anything() })
      )
    );
  });

  it('selecting a suggestion adds a chip to the tray', async () => {
    const { getByTestId, queryByTestId } = render(<LogFoodScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('food-suggestion-1'));
    fireEvent.press(getByTestId('food-suggestion-1'));
    expect(queryByTestId('food-chip-1')).toBeTruthy();
  });

  it('already-selected label is excluded from suggestions', async () => {
    const { getByTestId, queryByTestId } = render(<LogFoodScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('food-suggestion-1'));
    fireEvent.press(getByTestId('food-suggestion-1'));
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => expect(queryByTestId('food-suggestion-1')).toBeNull());
  });

  it('tapping a chip removes it', async () => {
    const { getByTestId, queryByTestId } = render(<LogFoodScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('food-suggestion-1'));
    fireEvent.press(getByTestId('food-suggestion-1'));
    fireEvent.press(getByTestId('food-chip-1'));
    expect(queryByTestId('food-chip-1')).toBeNull();
  });

  it('submit button is hidden when no chips are selected', async () => {
    const { queryByTestId } = render(<LogFoodScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    expect(queryByTestId('food-save-button')).toBeNull();
  });

  it('submit button appears when at least one chip is selected', async () => {
    const { getByTestId } = render(<LogFoodScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('food-suggestion-1'));
    fireEvent.press(getByTestId('food-suggestion-1'));
    expect(getByTestId('food-save-button')).toBeTruthy();
  });

  it('shows "+ Add" row when search has no results', async () => {
    mockGetLabels.mockResolvedValue([]);
    const { getByTestId, queryByTestId } = render(<LogFoodScreen />);
    fireEvent.changeText(getByTestId('food-search'), 'ZzCustomFood99');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => expect(queryByTestId('food-add-custom')).toBeTruthy());
  });

  it('does not show "+ Add" row when search has results', async () => {
    const { getByTestId, queryByTestId } = render(<LogFoodScreen />);
    fireEvent.changeText(getByTestId('food-search'), 'oat');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('food-suggestion-1'));
    expect(queryByTestId('food-add-custom')).toBeNull();
  });

  it('tapping "+ Add" calls createLabel with the search query', async () => {
    mockGetLabels.mockResolvedValue([]);
    const { getByTestId } = render(<LogFoodScreen />);
    fireEvent.changeText(getByTestId('food-search'), 'ZzCustomFood99');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('food-add-custom'));
    await act(async () => {
      fireEvent.press(getByTestId('food-add-custom'));
    });
    expect(mockCreateLabel).toHaveBeenCalledWith(
      expect.anything(),
      FOOD_ENTRY_TYPE.id,
      'ZzCustomFood99'
    );
  });

  it('custom food appears as chip after creation', async () => {
    mockGetLabels.mockResolvedValue([]);
    const { getByTestId, queryByTestId } = render(<LogFoodScreen />);
    fireEvent.changeText(getByTestId('food-search'), 'ZzCustomFood99');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('food-add-custom'));
    await act(async () => {
      fireEvent.press(getByTestId('food-add-custom'));
    });
    expect(queryByTestId('food-chip-99')).toBeTruthy();
  });

  it('submitting saves the correct label IDs', async () => {
    const { getByTestId } = render(<LogFoodScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('food-suggestion-1'));
    fireEvent.press(getByTestId('food-suggestion-1'));
    fireEvent.press(getByTestId('food-suggestion-2'));
    await act(async () => {
      fireEvent.press(getByTestId('food-save-button'));
    });
    expect(mockSaveEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entryTypeId: FOOD_ENTRY_TYPE.id,
        labelIds: expect.arrayContaining([1, 2]),
      })
    );
  });

  it('shows save confirmation after submit', async () => {
    const { getByTestId } = render(<LogFoodScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('food-suggestion-1'));
    fireEvent.press(getByTestId('food-suggestion-1'));
    await act(async () => {
      fireEvent.press(getByTestId('food-save-button'));
    });
    expect(getByTestId('food-save-confirmation')).toBeTruthy();
  });

  it('calls router.replace on confirmation dismiss', async () => {
    const { getByTestId } = render(<LogFoodScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('food-suggestion-1'));
    fireEvent.press(getByTestId('food-suggestion-1'));
    await act(async () => {
      fireEvent.press(getByTestId('food-save-button'));
    });
    act(() => { jest.advanceTimersByTime(2000); });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('applies food category colour to chip based on label categoryName', async () => {
    const { getByTestId } = render(<LogFoodScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('food-suggestion-1'));
    fireEvent.press(getByTestId('food-suggestion-1'));
    const chip = getByTestId('food-chip-1');
    // Grains category → chipButter (#FEEFBA)
    expect(chip.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#FEEFBA' }),
      ])
    );
  });
});
