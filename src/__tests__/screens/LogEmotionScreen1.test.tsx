import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import type { EntryType, Label } from '@/lib/db/query-types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/hooks', () => ({
  useEntryTypes: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  getTier1EmotionLabels: jest.fn(),
  saveEntry: jest.fn(),
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

const mockPush = jest.fn();

// eslint-disable-next-line import/first
import { useEntryTypes } from '@/hooks';
// eslint-disable-next-line import/first
import * as queries from '@/lib/db/queries';
// eslint-disable-next-line import/first
import LogEmotionScreen1 from '../../../app/(tabs)/(tend)/log/emotion/index';

const EMOTION_ENTRY_TYPE: EntryType = {
  id: 3,
  name: 'Emotion',
  title: 'Unveil',
  icon: null,
  prompt: 'What are you feeling?',
  measurementType: 'label_select',
};

function makeTier1Label(id: number, name: string): Label {
  return { id, entryTypeId: 3, name, parentId: null, categoryId: null, categoryName: null, sortOrder: id * 10 };
}

const TIER1_LABELS = [
  makeTier1Label(10, 'Bright'),
  makeTier1Label(11, 'Warm'),
  makeTier1Label(12, 'Still'),
  makeTier1Label(13, 'Heavy'),
  makeTier1Label(14, 'Charged'),
];

describe('LogEmotionScreen1', () => {
  const mockUseEntryTypes = jest.mocked(useEntryTypes);
  const mockGetTier1 = jest.mocked(queries.getTier1EmotionLabels);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEntryTypes.mockReturnValue({ entryTypes: [EMOTION_ENTRY_TYPE], loading: false, error: null });
    mockGetTier1.mockResolvedValue(TIER1_LABELS);
  });

  it('renders all 5 Tier-1 rows', async () => {
    const { getByTestId } = render(<LogEmotionScreen1 />);
    await waitFor(() => getByTestId('emotion-tier1-10'));
    for (const label of TIER1_LABELS) {
      expect(getByTestId(`emotion-tier1-${label.id}`)).toBeTruthy();
    }
  });

  it('renders the entry type prompt', async () => {
    const { getByText } = render(<LogEmotionScreen1 />);
    await waitFor(() => getByText('What are you feeling?'));
  });

  it('tapping a Tier-1 row navigates to tier2 with correct tier1Id', async () => {
    const { getByTestId } = render(<LogEmotionScreen1 />);
    await waitFor(() => getByTestId('emotion-tier1-11'));
    fireEvent.press(getByTestId('emotion-tier1-11'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: expect.stringContaining('tier2'), params: expect.objectContaining({ tier1Id: 11 }) })
    );
  });

  it('has testID emotion-screen-1 on root view', () => {
    const { getByTestId } = render(<LogEmotionScreen1 />);
    expect(getByTestId('emotion-screen-1')).toBeTruthy();
  });
});
