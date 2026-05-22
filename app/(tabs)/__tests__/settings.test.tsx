import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ─── mocks (must be declared before module import) ────────────────────────────

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

const mockSetFocusArchived = jest.fn();
const mockGetFocuses = jest.fn();
jest.mock('@/lib/db/queries', () => ({
  getFocuses: (...args: unknown[]) => mockGetFocuses(...args),
  setFocusArchived: (...args: unknown[]) => mockSetFocusArchived(...args),
}));

// ─── fixtures ─────────────────────────────────────────────────────────────────

const ACTIVE_FOCUS = { id: 1, name: 'Energy', description: null, archived: false, sortOrder: 0, createdAt: '' };
const ARCHIVED_FOCUS = { id: 2, name: 'Old Focus', description: null, archived: true, sortOrder: 1, createdAt: '' };

// eslint-disable-next-line import/first
import SettingsScreen from '../settings';

describe('SettingsScreen — visual hierarchy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a section divider between Privacy and Focus (always rendered)', async () => {
    mockGetFocuses.mockResolvedValue([]);
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByTestId('settings-section-divider')).toBeTruthy();
    });
  });

  it('Privacy section heading renders', async () => {
    mockGetFocuses.mockResolvedValue([]);
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByTestId('settings-section-privacy')).toBeTruthy();
    });
  });
});

describe('SettingsScreen — Focus section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetFocusArchived.mockResolvedValue(undefined);
  });

  it('hides Focus section when there are no focuses', async () => {
    mockGetFocuses.mockResolvedValue([]);
    const { queryByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(queryByText('Focus')).toBeNull();
    });
  });

  it('shows active focus rows with a settings icon', async () => {
    mockGetFocuses.mockResolvedValue([ACTIVE_FOCUS]);
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByTestId(`settings-focus-row-${ACTIVE_FOCUS.id}`)).toBeTruthy();
      expect(getByTestId(`settings-focus-edit-${ACTIVE_FOCUS.id}`)).toBeTruthy();
    });
  });

  it('tapping settings icon navigates to edit screen', async () => {
    mockGetFocuses.mockResolvedValue([ACTIVE_FOCUS]);
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => getByTestId(`settings-focus-edit-${ACTIVE_FOCUS.id}`));

    fireEvent.press(getByTestId(`settings-focus-edit-${ACTIVE_FOCUS.id}`));
    expect(mockPush).toHaveBeenCalledWith(`/focus/${ACTIVE_FOCUS.id}/edit`);
  });

  it('shows archived focus row with Unarchive button', async () => {
    mockGetFocuses.mockResolvedValue([ARCHIVED_FOCUS]);
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByTestId(`settings-focus-archived-row-${ARCHIVED_FOCUS.id}`)).toBeTruthy();
      expect(getByTestId(`settings-focus-unarchive-${ARCHIVED_FOCUS.id}`)).toBeTruthy();
    });
  });

  it('tapping Unarchive calls setFocusArchived(false) and hides the row optimistically', async () => {
    mockGetFocuses.mockResolvedValue([ARCHIVED_FOCUS]);
    const { getByTestId, queryByTestId } = render(<SettingsScreen />);
    await waitFor(() => getByTestId(`settings-focus-unarchive-${ARCHIVED_FOCUS.id}`));

    await act(async () => {
      fireEvent.press(getByTestId(`settings-focus-unarchive-${ARCHIVED_FOCUS.id}`));
    });

    await waitFor(() => {
      expect(mockSetFocusArchived).toHaveBeenCalledWith(expect.anything(), ARCHIVED_FOCUS.id, false);
      expect(queryByTestId(`settings-focus-archived-row-${ARCHIVED_FOCUS.id}`)).toBeNull();
    });
  });

  it('shows archived row again when setFocusArchived throws', async () => {
    mockGetFocuses.mockResolvedValue([ARCHIVED_FOCUS]);
    mockSetFocusArchived.mockRejectedValue(new Error('DB error'));
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => getByTestId(`settings-focus-unarchive-${ARCHIVED_FOCUS.id}`));

    await act(async () => {
      fireEvent.press(getByTestId(`settings-focus-unarchive-${ARCHIVED_FOCUS.id}`));
    });

    await waitFor(() => {
      expect(getByTestId(`settings-focus-archived-row-${ARCHIVED_FOCUS.id}`)).toBeTruthy();
    });
  });
});
