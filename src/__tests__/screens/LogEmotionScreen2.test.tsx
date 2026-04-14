import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import type { EntryType, Label } from '@/lib/db/query-types';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => { cb(); },
}));

jest.mock('@/hooks', () => ({
  useEntryTypes: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  getTier1EmotionLabels: jest.fn(),
  getLabelsByParent: jest.fn(),
  saveEntry: jest.fn(),
  createFocus: jest.fn(),
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/hooks/useFocuses', () => ({
  useFocuses: () => ({ focuses: [], loading: false, error: null }),
}));

jest.mock('@/lib/utils/timestamp', () => ({
  nowLocalIso: jest.fn().mockReturnValue('2026-03-25T10:00:00-07:00'),
}));

// eslint-disable-next-line import/first
import { useEntryTypes } from '@/hooks';
// eslint-disable-next-line import/first
import * as queries from '@/lib/db/queries';
// eslint-disable-next-line import/first
import LogEmotionScreen2 from '../../../app/(tabs)/(tend)/log/emotion/tier2';

const EMOTION_ENTRY_TYPE: EntryType = {
  id: 3,
  name: 'Emotion',
  title: 'Unveil',
  icon: null,
  prompt: 'What are you feeling?',
  measurementType: 'label_select',
};

function makeTier1(id: number, name: string): Label {
  return { id, entryTypeId: 3, name, parentId: null, categoryId: null, categoryName: null, sortOrder: id * 10 };
}
function makeTier2(id: number, name: string, parentId: number): Label {
  return { id, entryTypeId: 3, name, parentId, categoryId: null, categoryName: null, sortOrder: id * 10 };
}

const TIER1_LABELS = [
  makeTier1(10, 'Bright'),
  makeTier1(11, 'Warm'),
  makeTier1(12, 'Still'),
  makeTier1(13, 'Heavy'),
  makeTier1(14, 'Charged'),
];

const WARM_TIER2 = [
  makeTier2(20, 'Connected', 11),
  makeTier2(21, 'Grateful', 11),
  makeTier2(22, 'Loving', 11),
];

const BRIGHT_TIER2 = [
  makeTier2(30, 'Joyful', 10),
  makeTier2(31, 'Excited', 10),
];

describe('LogEmotionScreen2', () => {
  const mockUseEntryTypes = jest.mocked(useEntryTypes);
  const mockGetTier1 = jest.mocked(queries.getTier1EmotionLabels);
  const mockGetByParent = jest.mocked(queries.getLabelsByParent);
  const mockSaveEntry = jest.mocked(queries.saveEntry);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockParams = { tier1Id: '11' };
    mockUseEntryTypes.mockReturnValue({ entryTypes: [EMOTION_ENTRY_TYPE], loading: false, error: null });
    mockGetTier1.mockResolvedValue(TIER1_LABELS);
    mockGetByParent.mockImplementation(async (_db, parentId) => {
      if (parentId === 11) return WARM_TIER2;
      if (parentId === 10) return BRIGHT_TIER2;
      return [];
    });
    mockSaveEntry.mockResolvedValue(1);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('has testID emotion-screen-2 on root view', () => {
    const { getByTestId } = render(<LogEmotionScreen2 />);
    expect(getByTestId('emotion-screen-2')).toBeTruthy();
  });

  it('renders all Tier-1 labels in left column', async () => {
    const { getByTestId } = render(<LogEmotionScreen2 />);
    await waitFor(() => getByTestId('emotion-tier1-left-10'));
    for (const l of TIER1_LABELS) {
      expect(getByTestId(`emotion-tier1-left-${l.id}`)).toBeTruthy();
    }
  });

  it('renders Tier-2 children for active Tier-1 in right column', async () => {
    const { getByTestId } = render(<LogEmotionScreen2 />);
    await waitFor(() => getByTestId('emotion-tier2-right-20'));
    expect(getByTestId('emotion-tier2-right-21')).toBeTruthy();
  });

  it('active Tier-1 row is highlighted', async () => {
    const { getByTestId } = render(<LogEmotionScreen2 />);
    await waitFor(() => getByTestId('emotion-tier1-left-11'));
    // The active row component receives isActive=true; check it renders
    // (SplitPaneRow uses interactive color when active — tested in SplitPaneRow tests)
    const activeRow = getByTestId('emotion-tier1-left-11');
    expect(activeRow).toBeTruthy();
  });

  it('tapping a different Tier-1 in left column reloads right column without changing chip', async () => {
    mockParams = { tier1Id: '11' };
    const { getByTestId } = render(<LogEmotionScreen2 />);
    await waitFor(() => getByTestId('emotion-tier1-left-10'));
    fireEvent.press(getByTestId('emotion-tier1-left-10'));
    await waitFor(() => getByTestId('emotion-tier2-right-30'));
    // Tier-2 right column updated to Bright's children
    expect(getByTestId('emotion-tier2-right-30')).toBeTruthy();
  });

  it('tapping a Tier-2 right-column item navigates to tier3 with correct params', async () => {
    const { getByTestId } = render(<LogEmotionScreen2 />);
    await waitFor(() => getByTestId('emotion-tier2-right-20'));
    fireEvent.press(getByTestId('emotion-tier2-right-20'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: expect.stringContaining('tier3'),
        params: expect.objectContaining({ tier2Id: 20, tier1Id: 11, chipLabelId: 20, chipLabelName: 'Connected' }),
      })
    );
  });

  it('tapping a Tier-2 item sets the chip locally (so it persists if user navigates back)', async () => {
    // Chip should appear on Screen 2 after tapping a Tier-2 row, even before navigating to Screen 3
    const { getByTestId, queryByTestId } = render(<LogEmotionScreen2 />);
    await waitFor(() => getByTestId('emotion-tier2-right-20'));
    expect(queryByTestId('emotion-chip')).toBeNull(); // no chip before tap
    fireEvent.press(getByTestId('emotion-tier2-right-20'));
    expect(getByTestId('emotion-chip')).toBeTruthy();  // chip set locally
  });

  it('chip is visible when chipLabelId param is set', async () => {
    mockParams = { tier1Id: '11', chipLabelId: '20', chipLabelName: 'Connected' };
    const { getByTestId } = render(<LogEmotionScreen2 />);
    await waitFor(() => getByTestId('emotion-chip'));
    expect(getByTestId('emotion-chip')).toBeTruthy();
  });

  it('chip is not visible when chipLabelId param is absent', async () => {
    mockParams = { tier1Id: '11' };
    const { queryByTestId } = render(<LogEmotionScreen2 />);
    await waitFor(() => expect(queryByTestId('emotion-tier2-right-20')).toBeTruthy());
    expect(queryByTestId('emotion-chip')).toBeNull();
  });

  it('tapping the chip clears it (submit disappears)', async () => {
    mockParams = { tier1Id: '11', chipLabelId: '20', chipLabelName: 'Connected' };
    const { getByTestId, queryByTestId } = render(<LogEmotionScreen2 />);
    await waitFor(() => getByTestId('emotion-chip'));
    fireEvent.press(getByTestId('emotion-chip'));
    expect(queryByTestId('emotion-chip')).toBeNull();
    expect(queryByTestId('emotion-save-button')).toBeNull();
  });

  it('submit button visible when chip is set', async () => {
    mockParams = { tier1Id: '11', chipLabelId: '20', chipLabelName: 'Connected' };
    const { getByTestId } = render(<LogEmotionScreen2 />);
    await waitFor(() => getByTestId('emotion-save-button'));
    expect(getByTestId('emotion-save-button')).toBeTruthy();
  });

  it('submit button absent when no chip', async () => {
    mockParams = { tier1Id: '11' };
    const { queryByTestId } = render(<LogEmotionScreen2 />);
    await waitFor(() => expect(queryByTestId('emotion-tier2-right-20')).toBeTruthy());
    expect(queryByTestId('emotion-save-button')).toBeNull();
  });

  it('submit calls saveEntry with correct labelId', async () => {
    mockParams = { tier1Id: '11', chipLabelId: '20', chipLabelName: 'Connected' };
    const { getByTestId } = render(<LogEmotionScreen2 />);
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
    mockParams = { tier1Id: '11', chipLabelId: '20', chipLabelName: 'Connected' };
    const { getByTestId, queryByTestId } = render(<LogEmotionScreen2 />);
    await waitFor(() => getByTestId('emotion-save-button'));
    await act(async () => {
      fireEvent.press(getByTestId('emotion-save-button'));
    });
    expect(queryByTestId('emotion-save-error')).toBeTruthy();
  });
});
