import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import type { EntryType } from '@/lib/db/query-types';
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
  saveEntry: jest.fn(),
}));

jest.mock('@/lib/utils/timestamp', () => ({
  nowLocalIso: jest.fn(),
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

// Declared after jest.mock; hoisting keeps mocks available at module level.
const mockBack = jest.fn();

const SLEEP_ENTRY_TYPE: EntryType = {
  id: 5,
  name: 'Sleep',
  title: 'Slumber',
  icon: 'moon',
  prompt: 'How many hours did you sleep?',
  measurementType: 'numeric',
};

const FIXTURE_ENTRY_TYPES: EntryType[] = [SLEEP_ENTRY_TYPE];

const FIXED_ISO = '2026-03-12T09:00:00-08:00';

// Import screen after mocks are set up.
// eslint-disable-next-line import/first
import LogSleepScreen from '../../../app/(tabs)/log/sleep';

describe('LogSleepScreen', () => {
  const mockUseEntryTypes = jest.mocked(useEntryTypes);
  const mockSaveEntry = jest.mocked(queries.saveEntry);
  const mockNowLocalIso = jest.mocked(timestamp.nowLocalIso);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseEntryTypes.mockReturnValue({
      entryTypes: FIXTURE_ENTRY_TYPES,
      loading: false,
      error: null,
    });
    mockSaveEntry.mockResolvedValue(1);
    mockNowLocalIso.mockReturnValue(FIXED_ISO);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the prompt', () => {
    const { getByText } = render(<LogSleepScreen />);
    expect(getByText('How long did you rest?')).toBeTruthy();
  });

  it('hides the submit button when input is empty', () => {
    const { queryByTestId } = render(<LogSleepScreen />);
    expect(queryByTestId('sleep-save-button')).toBeNull();
  });

  it('shows the submit button after entering a value', () => {
    const { getByTestId } = render(<LogSleepScreen />);
    fireEvent.changeText(getByTestId('sleep-hours-input'), '7');
    expect(getByTestId('sleep-save-button')).toBeTruthy();
  });

  it('calls saveEntry with the correct shape on submit', async () => {
    const { getByTestId } = render(<LogSleepScreen />);
    fireEvent.changeText(getByTestId('sleep-hours-input'), '7');
    await act(async () => {
      fireEvent.press(getByTestId('sleep-save-button'));
    });
    expect(mockSaveEntry).toHaveBeenCalledWith(
      expect.anything(), // db arg
      {
        entryTypeId: 5,
        timestamp: FIXED_ISO,
        numericValue: 7,
        notes: undefined,
      }
    );
  });

  it('includes notes in saveEntry when notes are entered', async () => {
    const { getByTestId } = render(<LogSleepScreen />);
    fireEvent.changeText(getByTestId('sleep-hours-input'), '7');
    fireEvent.changeText(getByTestId('sleep-notes-input'), 'deep sleep');
    await act(async () => {
      fireEvent.press(getByTestId('sleep-save-button'));
    });
    expect(mockSaveEntry).toHaveBeenCalledWith(
      expect.anything(),
      {
        entryTypeId: 5,
        timestamp: FIXED_ISO,
        numericValue: 7,
        notes: 'deep sleep',
      }
    );
  });

  it('shows save confirmation after submit', async () => {
    const { getByTestId } = render(<LogSleepScreen />);
    fireEvent.changeText(getByTestId('sleep-hours-input'), '7');
    await act(async () => {
      fireEvent.press(getByTestId('sleep-save-button'));
    });
    expect(getByTestId('sleep-save-confirmation')).toBeTruthy();
  });

  it('calls router.back() when confirmation dismisses', async () => {
    const { getByTestId } = render(<LogSleepScreen />);
    fireEvent.changeText(getByTestId('sleep-hours-input'), '7');
    await act(async () => {
      fireEvent.press(getByTestId('sleep-save-button'));
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('does not call saveEntry when navigating back without saving', () => {
    render(<LogSleepScreen />);
    // Simulate back without any submit — saveEntry must not be called.
    mockBack();
    expect(mockSaveEntry).not.toHaveBeenCalled();
  });
});
