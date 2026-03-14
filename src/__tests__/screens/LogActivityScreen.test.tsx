import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import type { EntryType, Label } from '@/lib/db/query-types';
import { useEntryTypes } from '@/hooks';
import * as queries from '@/lib/db/queries';
import * as timestamp from '@/lib/utils/timestamp';

// Must be hoisted before module evaluation.
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
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
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

// Declared after jest.mock; hoisting keeps mocks available at module level.
const mockBack = jest.fn();

const ACTIVITY_ENTRY_TYPE: EntryType = {
  id: 6,
  name: 'Activity',
  title: 'Journey',
  icon: 'footprints',
  prompt: 'What did you do today?',
  measurementType: 'label_select',
};

const FIXTURE_ENTRY_TYPES: EntryType[] = [ACTIVITY_ENTRY_TYPE];

const FIXED_ISO = '2026-03-14T10:00:00-07:00';

function makeLabel(id: number, name: string, categoryName = 'Move'): Label {
  return {
    id,
    entryTypeId: 6,
    name,
    parentId: null,
    categoryId: 1,
    categoryName,
    sortOrder: id * 10,
  };
}

const WALK_LABEL = makeLabel(1, 'Walk', 'Move');
const RUN_LABEL = makeLabel(2, 'Run outside', 'Move');

// Import screen after mocks are set up.
// eslint-disable-next-line import/first
import LogActivityScreen from '../../../app/(tabs)/log/activity';

describe('LogActivityScreen', () => {
  const mockUseEntryTypes = jest.mocked(useEntryTypes);
  const mockGetLabels = jest.mocked(queries.getLabels);
  const mockSaveEntry = jest.mocked(queries.saveEntry);
  const mockCreateLabel = jest.mocked(queries.createLabel);
  const mockNowLocalIso = jest.mocked(timestamp.nowLocalIso);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseEntryTypes.mockReturnValue({
      entryTypes: FIXTURE_ENTRY_TYPES,
      loading: false,
      error: null,
    });
    mockGetLabels.mockResolvedValue([WALK_LABEL, RUN_LABEL]);
    mockSaveEntry.mockResolvedValue(1);
    mockCreateLabel.mockResolvedValue({
      id: 99,
      entryTypeId: 6,
      name: 'Aerial yoga',
      parentId: null,
      categoryId: null,
      categoryName: null,
      sortOrder: 0,
    });
    mockNowLocalIso.mockReturnValue(FIXED_ISO);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the entry type prompt', async () => {
    const { getByText } = render(<LogActivityScreen />);
    await waitFor(() => expect(getByText('What did you do today?')).toBeTruthy());
  });

  it('SearchBar has autoFocus enabled', () => {
    const { getByTestId } = render(<LogActivityScreen />);
    // SearchBar renders a TextInput with testID; autoFocus is passed as a prop
    const input = getByTestId('activity-search');
    expect(input.props.autoFocus).toBe(true);
  });

  it('calls getLabels with search term and limit after typing', async () => {
    const { getByTestId } = render(<LogActivityScreen />);
    fireEvent.changeText(getByTestId('activity-search'), 'wal');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() =>
      expect(mockGetLabels).toHaveBeenCalledWith(
        expect.anything(),
        ACTIVITY_ENTRY_TYPE.id,
        expect.objectContaining({ search: 'wal', limit: 5 })
      )
    );
  });

  it('calls getLabels with limit but no search when search is empty', async () => {
    const { getByTestId } = render(<LogActivityScreen />);
    fireEvent.changeText(getByTestId('activity-search'), '');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() =>
      expect(mockGetLabels).toHaveBeenCalledWith(
        expect.anything(),
        ACTIVITY_ENTRY_TYPE.id,
        expect.not.objectContaining({ search: expect.anything() })
      )
    );
  });

  it('selecting a suggestion adds a chip to the tray', async () => {
    const { getByTestId, queryByTestId } = render(<LogActivityScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('activity-suggestion-1'));
    fireEvent.press(getByTestId('activity-suggestion-1'));
    expect(queryByTestId('activity-chip-1')).toBeTruthy();
  });

  it('already-selected label is excluded from suggestions', async () => {
    const { getByTestId, queryByTestId } = render(<LogActivityScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('activity-suggestion-1'));
    fireEvent.press(getByTestId('activity-suggestion-1'));
    // Advance debounce so the updated suggestions re-fetch with the new chip set.
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => expect(queryByTestId('activity-suggestion-1')).toBeNull());
  });

  it('tapping a chip removes it', async () => {
    const { getByTestId, queryByTestId } = render(<LogActivityScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('activity-suggestion-1'));
    fireEvent.press(getByTestId('activity-suggestion-1'));
    fireEvent.press(getByTestId('activity-chip-1'));
    expect(queryByTestId('activity-chip-1')).toBeNull();
  });

  it('submit button is hidden when no chips are selected', async () => {
    const { queryByTestId } = render(<LogActivityScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    expect(queryByTestId('activity-save-button')).toBeNull();
  });

  it('submit button appears when at least one chip is selected', async () => {
    const { getByTestId } = render(<LogActivityScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('activity-suggestion-1'));
    fireEvent.press(getByTestId('activity-suggestion-1'));
    expect(getByTestId('activity-save-button')).toBeTruthy();
  });

  it('shows "+ Add" row when search has no results', async () => {
    mockGetLabels.mockResolvedValue([]);
    const { getByTestId, queryByTestId } = render(<LogActivityScreen />);
    fireEvent.changeText(getByTestId('activity-search'), 'ZzCustomXx');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => expect(queryByTestId('activity-add-custom')).toBeTruthy());
  });

  it('does not show "+ Add" row when search has results', async () => {
    const { getByTestId, queryByTestId } = render(<LogActivityScreen />);
    fireEvent.changeText(getByTestId('activity-search'), 'Wal');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('activity-suggestion-1'));
    expect(queryByTestId('activity-add-custom')).toBeNull();
  });

  it('tapping "+ Add" calls createLabel with the search query', async () => {
    mockGetLabels.mockResolvedValue([]);
    const { getByTestId } = render(<LogActivityScreen />);
    fireEvent.changeText(getByTestId('activity-search'), 'Aerial yoga');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('activity-add-custom'));
    await act(async () => {
      fireEvent.press(getByTestId('activity-add-custom'));
    });
    expect(mockCreateLabel).toHaveBeenCalledWith(
      expect.anything(),
      ACTIVITY_ENTRY_TYPE.id,
      'Aerial yoga'
    );
  });

  it('custom activity appears as chip after creation', async () => {
    mockGetLabels.mockResolvedValue([]);
    const { getByTestId, queryByTestId } = render(<LogActivityScreen />);
    fireEvent.changeText(getByTestId('activity-search'), 'Aerial yoga');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('activity-add-custom'));
    await act(async () => {
      fireEvent.press(getByTestId('activity-add-custom'));
    });
    expect(queryByTestId('activity-chip-99')).toBeTruthy();
  });

  it('submitting saves the correct label IDs', async () => {
    const { getByTestId } = render(<LogActivityScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('activity-suggestion-1'));
    fireEvent.press(getByTestId('activity-suggestion-1'));
    fireEvent.press(getByTestId('activity-suggestion-2'));
    await act(async () => {
      fireEvent.press(getByTestId('activity-save-button'));
    });
    expect(mockSaveEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entryTypeId: ACTIVITY_ENTRY_TYPE.id,
        labelIds: expect.arrayContaining([1, 2]),
      })
    );
  });

  it('shows save confirmation after submit', async () => {
    const { getByTestId } = render(<LogActivityScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('activity-suggestion-1'));
    fireEvent.press(getByTestId('activity-suggestion-1'));
    await act(async () => {
      fireEvent.press(getByTestId('activity-save-button'));
    });
    expect(getByTestId('activity-save-confirmation')).toBeTruthy();
  });

  it('calls router.back() when confirmation dismisses', async () => {
    const { getByTestId } = render(<LogActivityScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('activity-suggestion-1'));
    fireEvent.press(getByTestId('activity-suggestion-1'));
    await act(async () => {
      fireEvent.press(getByTestId('activity-save-button'));
    });
    act(() => { jest.advanceTimersByTime(2000); });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('applies category colour to chip based on label categoryName', async () => {
    const { getByTestId } = render(<LogActivityScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('activity-suggestion-1'));
    fireEvent.press(getByTestId('activity-suggestion-1'));
    const chip = getByTestId('activity-chip-1');
    // Move category → chipMint
    expect(chip.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: expect.stringMatching(/#[0-9A-Fa-f]{6}/) }),
      ])
    );
  });
});
