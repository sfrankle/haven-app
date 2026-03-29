import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import type { EntryType } from '@/lib/db/query-types';
import { useEntryTypes } from '@/hooks';
import * as queries from '@/lib/db/queries';
import * as timestamp from '@/lib/utils/timestamp';

const mockBack = jest.fn();

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

const HYDRATION_ENTRY_TYPE: EntryType = {
  id: 4,
  name: 'Hydration',
  title: 'Hydrate',
  icon: 'water',
  prompt: 'How much did you drink?',
  measurementType: 'numeric',
};

const FIXED_ISO = '2026-03-12T09:00:00-08:00';

// Import screen after mocks are set up.
// eslint-disable-next-line import/first
import LogHydrationScreen from '../../../app/(tabs)/(tend)/log/hydration';

describe('LogHydrationScreen', () => {
  const mockUseEntryTypes = jest.mocked(useEntryTypes);
  const mockSaveEntry = jest.mocked(queries.saveEntry);
  const mockGetDailyHydrationTotal = jest.mocked(queries.getDailyHydrationTotal);
  const mockNowLocalIso = jest.mocked(timestamp.nowLocalIso);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseEntryTypes.mockReturnValue({
      entryTypes: [HYDRATION_ENTRY_TYPE],
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

  it('shows an error message when saveEntry throws', async () => {
    mockSaveEntry.mockRejectedValue(new Error('db error'));
    const { getByTestId, queryByTestId } = render(<LogHydrationScreen />);
    fireEvent.changeText(getByTestId('hydration-oz-input'), '16');
    await act(async () => {
      fireEvent.press(getByTestId('hydration-save-button'));
    });
    expect(queryByTestId('hydration-save-error')).toBeTruthy();
  });
});
