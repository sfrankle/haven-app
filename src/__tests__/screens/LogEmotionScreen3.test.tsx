import React from 'react';
import { render, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import type { EntryType, Label } from '@/lib/db/query-types';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/hooks', () => ({
  useEntryTypes: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  getLabelsByParent: jest.fn(),
  saveEntry: jest.fn(),
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/lib/utils/timestamp', () => ({
  nowLocalIso: jest.fn().mockReturnValue('2026-03-25T10:00:00-07:00'),
}));

// eslint-disable-next-line import/first
import { useEntryTypes } from '@/hooks';
// eslint-disable-next-line import/first
import * as queries from '@/lib/db/queries';
// eslint-disable-next-line import/first
import LogEmotionScreen3 from '../../../app/(tabs)/(tend)/log/emotion/tier3';

const EMOTION_ENTRY_TYPE: EntryType = {
  id: 3,
  name: 'Emotion',
  title: 'Unveil',
  icon: null,
  prompt: 'What are you feeling?',
  measurementType: 'label_select',
};

function makeTier2(id: number, name: string, parentId: number): Label {
  return { id, entryTypeId: 3, name, parentId, categoryId: null, categoryName: null, sortOrder: id * 10 };
}
function makeTier3(id: number, name: string, parentId: number): Label {
  return { id, entryTypeId: 3, name, parentId, categoryId: null, categoryName: null, sortOrder: id * 10 };
}

const WARM_TIER2 = [
  makeTier2(20, 'Connected', 11),
  makeTier2(21, 'Grateful', 11),
];

const CONNECTED_TIER3 = [
  makeTier3(100, 'Loved', 20),
  makeTier3(101, 'Close', 20),
];

const GRATEFUL_TIER3 = [
  makeTier3(110, 'Thankful', 21),
];

describe('LogEmotionScreen3', () => {
  const mockUseEntryTypes = jest.mocked(useEntryTypes);
  const mockGetByParent = jest.mocked(queries.getLabelsByParent);
  const mockSaveEntry = jest.mocked(queries.saveEntry);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockParams = { tier1Id: '11', tier2Id: '20', chipLabelId: '20', chipLabelName: 'Connected' };
    mockUseEntryTypes.mockReturnValue({ entryTypes: [EMOTION_ENTRY_TYPE], loading: false, error: null });
    mockGetByParent.mockImplementation(async (_db, parentId) => {
      if (parentId === 11) return WARM_TIER2;
      if (parentId === 20) return CONNECTED_TIER3;
      if (parentId === 21) return GRATEFUL_TIER3;
      return [];
    });
    mockSaveEntry.mockResolvedValue(1);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('has testID emotion-screen-3 on root view', () => {
    const { getByTestId } = render(<LogEmotionScreen3 />);
    expect(getByTestId('emotion-screen-3')).toBeTruthy();
  });

  it('shows empty state when active Tier-2 has no Tier-3 children', async () => {
    mockGetByParent.mockImplementation(async (_db, parentId) => {
      if (parentId === 11) return WARM_TIER2;
      return []; // no Tier-3 children
    });
    const { getByTestId } = render(<LogEmotionScreen3 />);
    await waitFor(() => getByTestId('emotion-tier3-empty'));
    expect(getByTestId('emotion-tier3-empty')).toBeTruthy();
  });

  it('renders Tier-2 siblings in left column', async () => {
    const { getByTestId } = render(<LogEmotionScreen3 />);
    await waitFor(() => getByTestId('emotion-tier2-left-20'));
    expect(getByTestId('emotion-tier2-left-21')).toBeTruthy();
  });

  it('renders Tier-3 children of active Tier-2 in right column', async () => {
    const { getByTestId } = render(<LogEmotionScreen3 />);
    await waitFor(() => getByTestId('emotion-tier3-right-100'));
    expect(getByTestId('emotion-tier3-right-101')).toBeTruthy();
  });

  it('tapping a Tier-3 item updates the chip in place without navigating', async () => {
    const { getByTestId } = render(<LogEmotionScreen3 />);
    await waitFor(() => getByTestId('emotion-tier3-right-100'));
    fireEvent.press(getByTestId('emotion-tier3-right-100'));
    // Chip stays visible; no router.replace call (no full-screen reload)
    expect(getByTestId('emotion-chip')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('tapping a Tier-2 item in left column swaps right column and updates chip to that Tier-2 label', async () => {
    const { getByTestId, queryByTestId } = render(<LogEmotionScreen3 />);
    await waitFor(() => getByTestId('emotion-tier2-left-21'));
    fireEvent.press(getByTestId('emotion-tier2-left-21'));
    await waitFor(() => expect(queryByTestId('emotion-tier3-right-110')).toBeTruthy());
    // Chip should now show the Tier-2 label that was pressed
    const chip = getByTestId('emotion-chip');
    expect(within(chip).getByText('Grateful')).toBeTruthy();
  });

  it('chip is visible', async () => {
    const { getByTestId } = render(<LogEmotionScreen3 />);
    await waitFor(() => getByTestId('emotion-chip'));
    expect(getByTestId('emotion-chip')).toBeTruthy();
  });

  it('tapping the chip clears it and submit disappears', async () => {
    const { getByTestId, queryByTestId } = render(<LogEmotionScreen3 />);
    await waitFor(() => getByTestId('emotion-chip'));
    fireEvent.press(getByTestId('emotion-chip'));
    expect(queryByTestId('emotion-chip')).toBeNull();
    expect(queryByTestId('emotion-save-button')).toBeNull();
  });

  it('submit button visible when chip is set', async () => {
    const { getByTestId } = render(<LogEmotionScreen3 />);
    await waitFor(() => getByTestId('emotion-save-button'));
    expect(getByTestId('emotion-save-button')).toBeTruthy();
  });

  it('submit calls saveEntry with the current chip label id', async () => {
    const { getByTestId } = render(<LogEmotionScreen3 />);
    await waitFor(() => getByTestId('emotion-save-button'));
    await act(async () => {
      fireEvent.press(getByTestId('emotion-save-button'));
    });
    expect(mockSaveEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ entryTypeId: 3, labelIds: [20] })
    );
  });

  it('shows an error message when saveEntry throws', async () => {
    mockSaveEntry.mockRejectedValue(new Error('db error'));
    const { getByTestId, queryByTestId } = render(<LogEmotionScreen3 />);
    await waitFor(() => getByTestId('emotion-save-button'));
    await act(async () => {
      fireEvent.press(getByTestId('emotion-save-button'));
    });
    expect(queryByTestId('emotion-save-error')).toBeTruthy();
  });
});
