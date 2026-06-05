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
const mockSetRoutineArchived = jest.fn();
const mockGetRoutines = jest.fn();
jest.mock('@/lib/db/queries', () => ({
  getFocuses: (...args: unknown[]) => mockGetFocuses(...args),
  setFocusArchived: (...args: unknown[]) => mockSetFocusArchived(...args),
  getRoutines: (...args: unknown[]) => mockGetRoutines(...args),
  setRoutineArchived: (...args: unknown[]) => mockSetRoutineArchived(...args),
}));

// ─── fixtures ─────────────────────────────────────────────────────────────────

const ACTIVE_FOCUS = { id: 1, name: 'Energy', description: null, archived: false, sortOrder: 0, createdAt: '' };
const ARCHIVED_FOCUS = { id: 2, name: 'Old Focus', description: null, archived: true, sortOrder: 1, createdAt: '' };

const ACTIVE_ROUTINE = {
  id: 10, name: 'Morning Reset', associatedFocusId: null,
  frequencyNote: null, sortOrder: 0, archived: false,
  createdAt: '', updatedAt: '', timeBlocks: [],
};
const ARCHIVED_ROUTINE = {
  id: 11, name: 'Old Routine', associatedFocusId: null,
  frequencyNote: null, sortOrder: 1, archived: true,
  createdAt: '', updatedAt: '', timeBlocks: [],
};

// eslint-disable-next-line import/first
import SettingsScreen from '../settings';

describe('SettingsScreen — visual hierarchy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRoutines.mockResolvedValue([]);
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
    mockGetRoutines.mockResolvedValue([]);
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

describe('SettingsScreen — Routines section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetRoutineArchived.mockResolvedValue(undefined);
    mockGetFocuses.mockResolvedValue([]);
  });

  it('shows the Routines section heading even with no routines', async () => {
    mockGetRoutines.mockResolvedValue([]);
    const { queryByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(queryByText('Routines')).not.toBeNull();
    });
  });

  it('shows + Add Routine when no routines exist', async () => {
    mockGetRoutines.mockResolvedValue([]);
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByTestId('settings-routines-add-row')).toBeTruthy();
      expect(getByTestId('settings-routines-add-button')).toBeTruthy();
    });
  });

  it('tapping + Add Routine navigates to /routine/create', async () => {
    mockGetRoutines.mockResolvedValue([]);
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => getByTestId('settings-routines-add-button'));

    fireEvent.press(getByTestId('settings-routines-add-button'));
    expect(mockPush).toHaveBeenCalledWith('/routine/create');
  });

  it('keeps + Add Routine visible alongside active routines', async () => {
    // Settings is the canonical create-anytime surface, so + Add Routine is
    // always available — not gated on the empty state.
    mockGetRoutines.mockResolvedValue([ACTIVE_ROUTINE]);
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => getByTestId(`settings-routine-row-${ACTIVE_ROUTINE.id}`));
    expect(getByTestId('settings-routines-add-row')).toBeTruthy();
  });

  it('keeps + Add Routine visible alongside archived routines', async () => {
    mockGetRoutines.mockResolvedValue([ARCHIVED_ROUTINE]);
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => getByTestId(`settings-routine-archived-row-${ARCHIVED_ROUTINE.id}`));
    expect(getByTestId('settings-routines-add-row')).toBeTruthy();
  });

  it('shows active routine rows with a gear icon', async () => {
    mockGetRoutines.mockResolvedValue([ACTIVE_ROUTINE]);
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByTestId(`settings-routine-row-${ACTIVE_ROUTINE.id}`)).toBeTruthy();
      expect(getByTestId(`settings-routine-edit-${ACTIVE_ROUTINE.id}`)).toBeTruthy();
    });
  });

  it('tapping gear icon navigates to the edit screen', async () => {
    mockGetRoutines.mockResolvedValue([ACTIVE_ROUTINE]);
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => getByTestId(`settings-routine-edit-${ACTIVE_ROUTINE.id}`));

    fireEvent.press(getByTestId(`settings-routine-edit-${ACTIVE_ROUTINE.id}`));
    expect(mockPush).toHaveBeenCalledWith(`/routine/${ACTIVE_ROUTINE.id}/edit`);
  });

  it('shows archived routine with an Unarchive button', async () => {
    mockGetRoutines.mockResolvedValue([ARCHIVED_ROUTINE]);
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByTestId(`settings-routine-archived-row-${ARCHIVED_ROUTINE.id}`)).toBeTruthy();
      expect(getByTestId(`settings-routine-unarchive-${ARCHIVED_ROUTINE.id}`)).toBeTruthy();
    });
  });

  it('tapping Unarchive calls setRoutineArchived(false) and hides the row optimistically', async () => {
    mockGetRoutines.mockResolvedValue([ARCHIVED_ROUTINE]);
    const { getByTestId, queryByTestId } = render(<SettingsScreen />);
    await waitFor(() => getByTestId(`settings-routine-unarchive-${ARCHIVED_ROUTINE.id}`));

    await act(async () => {
      fireEvent.press(getByTestId(`settings-routine-unarchive-${ARCHIVED_ROUTINE.id}`));
    });

    await waitFor(() => {
      expect(mockSetRoutineArchived).toHaveBeenCalledWith(expect.anything(), ARCHIVED_ROUTINE.id, false);
      expect(queryByTestId(`settings-routine-archived-row-${ARCHIVED_ROUTINE.id}`)).toBeNull();
    });
  });

  it('keeps + Add Routine visible after optimistically unarchiving the only routine', async () => {
    // + Add Routine is always present, so it stays visible through the
    // optimistic unarchive (the archived row disappears, the add row does not).
    mockGetRoutines.mockResolvedValue([ARCHIVED_ROUTINE]);
    const { getByTestId, queryByTestId } = render(<SettingsScreen />);
    await waitFor(() => getByTestId(`settings-routine-unarchive-${ARCHIVED_ROUTINE.id}`));

    await act(async () => {
      fireEvent.press(getByTestId(`settings-routine-unarchive-${ARCHIVED_ROUTINE.id}`));
    });

    await waitFor(() => {
      expect(queryByTestId(`settings-routine-archived-row-${ARCHIVED_ROUTINE.id}`)).toBeNull();
    });
    expect(getByTestId('settings-routines-add-row')).toBeTruthy();
  });

  it('shows the archived row again when setRoutineArchived throws', async () => {
    mockGetRoutines.mockResolvedValue([ARCHIVED_ROUTINE]);
    mockSetRoutineArchived.mockRejectedValue(new Error('DB error'));
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => getByTestId(`settings-routine-unarchive-${ARCHIVED_ROUTINE.id}`));

    await act(async () => {
      fireEvent.press(getByTestId(`settings-routine-unarchive-${ARCHIVED_ROUTINE.id}`));
    });

    await waitFor(() => {
      expect(getByTestId(`settings-routine-archived-row-${ARCHIVED_ROUTINE.id}`)).toBeTruthy();
    });
  });

  it('always renders the second section divider, even with no routines', async () => {
    mockGetRoutines.mockResolvedValue([]);
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByTestId('settings-routines-divider')).toBeTruthy();
    });
  });
});
