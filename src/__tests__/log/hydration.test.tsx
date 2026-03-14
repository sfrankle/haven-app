import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import type { EntryType } from '@/lib/db/query-types';
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
  saveEntry: jest.fn(),
  getDailyHydrationTotal: jest.fn(),
}));

jest.mock('@/lib/utils/timestamp', () => ({
  nowLocalIso: jest.fn(),
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

// Declared after jest.mock; hoisting keeps mocks available at module level.
const mockBack = jest.fn();

const HYDRATION_ENTRY_TYPE: EntryType = {
  id: 2,
  name: 'Hydration',
  title: 'Replenish',
  icon: 'droplet',
  prompt: 'How much water have you had?',
  measurementType: 'numeric',
};

const FIXTURE_ENTRY_TYPES: EntryType[] = [HYDRATION_ENTRY_TYPE];

const FIXED_ISO = '2026-03-12T09:00:00-08:00';

// Import screen after mocks are set up.
// eslint-disable-next-line import/first
import LogHydrationScreen from '../../../app/(tabs)/log/hydration';

describe('LogHydrationScreen', () => {
  const mockUseEntryTypes = jest.mocked(useEntryTypes);
  const mockSaveEntry = jest.mocked(queries.saveEntry);
  const mockGetDailyHydrationTotal = jest.mocked(queries.getDailyHydrationTotal);
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
    mockGetDailyHydrationTotal.mockResolvedValue(0);
    mockNowLocalIso.mockReturnValue(FIXED_ISO);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the prompt', async () => {
    const { getByText } = render(<LogHydrationScreen />);
    await act(async () => {});
    expect(getByText('How much water have you had?')).toBeTruthy();
  });

  it('pre-fills the numeric input with 16', async () => {
    const { getByTestId } = render(<LogHydrationScreen />);
    await act(async () => {});
    expect(getByTestId('hydration-oz-input').props.value).toBe('16');
  });

  it('shows the oz unit label', async () => {
    const { getByText } = render(<LogHydrationScreen />);
    await act(async () => {});
    expect(getByText('oz')).toBeTruthy();
  });

  it('hides the submit button when input is empty', async () => {
    const { getByTestId, queryByTestId } = render(<LogHydrationScreen />);
    await act(async () => {});
    fireEvent.changeText(getByTestId('hydration-oz-input'), '');
    expect(queryByTestId('hydration-save-button')).toBeNull();
  });

  it('shows the submit button when input is non-empty', async () => {
    const { getByTestId } = render(<LogHydrationScreen />);
    await act(async () => {});
    expect(getByTestId('hydration-save-button')).toBeTruthy();
  });

  it('calls saveEntry with the correct numeric value on submit', async () => {
    const { getByTestId } = render(<LogHydrationScreen />);
    await act(async () => {});
    await act(async () => {
      fireEvent.press(getByTestId('hydration-save-button'));
    });
    expect(mockSaveEntry).toHaveBeenCalledWith(
      expect.anything(),
      {
        entryTypeId: 2,
        timestamp: FIXED_ISO,
        numericValue: 16,
        notes: undefined,
      }
    );
  });

  it('saves the oz value the user typed', async () => {
    const { getByTestId } = render(<LogHydrationScreen />);
    await act(async () => {});
    fireEvent.changeText(getByTestId('hydration-oz-input'), '24');
    await act(async () => {
      fireEvent.press(getByTestId('hydration-save-button'));
    });
    expect(mockSaveEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ numericValue: 24 })
    );
  });

  it('updates the daily total display after save', async () => {
    mockGetDailyHydrationTotal
      .mockResolvedValueOnce(0)   // on mount
      .mockResolvedValueOnce(16); // after save
    const { getByText, getByTestId } = render(<LogHydrationScreen />);
    // Wait for mount fetch
    await act(async () => {});
    expect(getByText('Today: 0 oz')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByTestId('hydration-save-button'));
    });
    expect(getByText('Today: 16 oz')).toBeTruthy();
  });

  it('fetches daily total using the correct date derived from nowLocalIso', async () => {
    const tomorrowIso = '2026-03-13T00:30:00-08:00';
    mockNowLocalIso.mockReturnValue(tomorrowIso);
    mockGetDailyHydrationTotal.mockResolvedValue(0);
    render(<LogHydrationScreen />);
    await act(async () => {});
    expect(mockGetDailyHydrationTotal).toHaveBeenCalledWith(
      expect.anything(),
      '2026-03-13'
    );
  });

  it('shows save confirmation after submit', async () => {
    const { getByTestId } = render(<LogHydrationScreen />);
    await act(async () => {});
    await act(async () => {
      fireEvent.press(getByTestId('hydration-save-button'));
    });
    expect(getByTestId('hydration-save-confirmation')).toBeTruthy();
  });

  it('calls router.replace on confirmation dismisses', async () => {
    const { getByTestId } = render(<LogHydrationScreen />);
    await act(async () => {});
    await act(async () => {
      fireEvent.press(getByTestId('hydration-save-button'));
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('does not call saveEntry without explicit submit', async () => {
    render(<LogHydrationScreen />);
    await act(async () => {});
    expect(mockSaveEntry).not.toHaveBeenCalled();
  });
});
