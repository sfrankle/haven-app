import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { useTraceEntries } from '@/hooks/useTraceEntries';
import { useFocuses } from '@/hooks/useFocuses';
import type { EntryWithLabels } from '@/lib/db/query-types';
import type { TraceSection } from '@/lib/utils/traceUtils';

const mockRouterPush = jest.fn();

// Shared refs for tabPress listener wiring (item 6)
let tabPressCallback: (() => void) | undefined;
const mockIsFocused = jest.fn(() => true);
const mockAddListener = jest.fn((event: string, cb: () => void) => {
  if (event === 'tabPress') tabPressCallback = cb;
  return jest.fn(); // returns unsubscribe fn
});

jest.mock('@/hooks/useTraceEntries');
jest.mock('@/hooks/useFocuses', () => ({
  useFocuses: jest.fn().mockReturnValue({ focuses: [], loading: false, error: null }),
}));
jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/db/queries', () => ({
  getContextEntries: jest.fn().mockResolvedValue([]),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useRouter: () => ({ back: jest.fn(), push: mockRouterPush }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    addListener: mockAddListener,
    isFocused: mockIsFocused,
  }),
}));

const mockUseTraceEntries = useTraceEntries as jest.MockedFunction<typeof useTraceEntries>;
const mockUseFocuses = useFocuses as jest.MockedFunction<typeof useFocuses>;

function makeEntry(overrides: Partial<EntryWithLabels> = {}): EntryWithLabels {
  return {
    id: 1,
    entryTypeId: 2,
    entryTypeName: 'Sleep',
    entryTypeTitle: 'Sleep',
    entryTypeIcon: 'moon',
    sourceType: 'log',
    timestamp: '2026-03-25T08:00:00-07:00',
    localDate: '2026-03-25',
    numericValue: 7,
    notes: null,
    labels: [],
    ...overrides,
  };
}

function makeSection(title: string, entries: EntryWithLabels[]): TraceSection {
  return { title, data: entries };
}

// Import the screen component under test
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TraceScreen = require('../../../app/(tabs)/trace').default as React.ComponentType;

describe('TraceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an error message when useTraceEntries returns an error', () => {
    mockUseTraceEntries.mockReturnValue({ sections: [], loading: false, error: new Error('db error') });
    const { getByTestId } = render(<TraceScreen />);
    expect(getByTestId('trace-load-error')).toBeTruthy();
  });

  it('renders nothing while loading', () => {
    mockUseTraceEntries.mockReturnValue({ sections: [], loading: true, error: null });
    const { queryByText } = render(<TraceScreen />);
    expect(queryByText('Nothing logged yet.')).toBeNull();
    expect(queryByText('Today')).toBeNull();
  });

  it('renders empty state when no entries', () => {
    mockUseTraceEntries.mockReturnValue({ sections: [], loading: false, error: null });
    const { getByText } = render(<TraceScreen />);
    expect(getByText('Nothing logged yet.')).toBeTruthy();
  });

  it('renders a date header and row summary for a single entry', () => {
    const entry = makeEntry({ numericValue: 7 });
    mockUseTraceEntries.mockReturnValue({
      sections: [makeSection('Today', [entry])],
      loading: false,
      error: null,
    });
    const { getByText } = render(<TraceScreen />);
    expect(getByText('Today')).toBeTruthy();
    expect(getByText('Slept 7 hours')).toBeTruthy();
  });

  it('renders the entry type icon (testID) on each row', () => {
    const entry = makeEntry({ numericValue: 7, entryTypeIcon: 'moon' });
    mockUseTraceEntries.mockReturnValue({
      sections: [makeSection('Today', [entry])],
      loading: false,
      error: null,
    });
    const { getByTestId } = render(<TraceScreen />);
    // Each row should render an icon with testID derived from the entry id
    expect(getByTestId('trace-row-icon-1')).toBeTruthy();
  });

  it('renders the formatted time on each row', () => {
    const entry = makeEntry({ numericValue: 7, timestamp: '2026-03-25T08:00:00-07:00' });
    mockUseTraceEntries.mockReturnValue({
      sections: [makeSection('Today', [entry])],
      loading: false,
      error: null,
    });
    const { getByText } = render(<TraceScreen />);
    expect(getByText('8:00 AM')).toBeTruthy();
  });

  it('tapping a row expands it and shows chips', () => {
    const entry = makeEntry({
      numericValue: null,
      entryTypeName: 'Food',
      labels: [
        { id: 10, entryTypeId: 3, name: 'Oats', parentId: null, categoryId: null, categoryName: null, sortOrder: 0 },
      ],
    });
    mockUseTraceEntries.mockReturnValue({
      sections: [makeSection('Today', [entry])],
      loading: false,
      error: null,
    });
    const { getByText, queryByText } = render(<TraceScreen />);
    // chip label not visible before expand
    expect(queryByText('Oats')).toBeNull();
    // tap the row to expand
    fireEvent.press(getByText('Ate Oats'));
    expect(getByText('Oats')).toBeTruthy();
  });

  it('gaining focus collapses all expanded rows', () => {
    let focusCb: (() => void) | undefined;
    (require('expo-router').useFocusEffect as jest.Mock).mockImplementation((cb: () => void) => {
      focusCb = cb;
    });

    const entry = makeEntry({
      numericValue: null,
      entryTypeName: 'Food',
      labels: [
        { id: 10, entryTypeId: 3, name: 'Oats', parentId: null, categoryId: null, categoryName: null, sortOrder: 0 },
      ],
    });
    mockUseTraceEntries.mockReturnValue({
      sections: [makeSection('Today', [entry])],
      loading: false,
      error: null,
    });

    const { getByText, queryByText } = render(<TraceScreen />);
    fireEvent.press(getByText('Ate Oats'));
    expect(getByText('Oats')).toBeTruthy();

    act(() => { focusCb?.(); });
    expect(queryByText('Oats')).toBeNull();
  });

  it('shows notes text when entry has notes and row is expanded', () => {
    const entry = makeEntry({ notes: 'felt great today', id: 7 });
    mockUseTraceEntries.mockReturnValue({
      sections: [makeSection('Today', [entry])],
      loading: false,
      error: null,
    });
    const { getByText, getByTestId, queryByTestId } = render(<TraceScreen />);
    expect(queryByTestId('trace-notes-7')).toBeNull();
    fireEvent.press(getByText('Slept 7 hours'));
    expect(getByTestId('trace-notes-7')).toBeTruthy();
    expect(getByText('felt great today')).toBeTruthy();
  });

  it('does not show notes when entry notes is null', () => {
    const entry = makeEntry({ notes: null, id: 8 });
    mockUseTraceEntries.mockReturnValue({
      sections: [makeSection('Today', [entry])],
      loading: false,
      error: null,
    });
    const { getByText, queryByTestId } = render(<TraceScreen />);
    fireEvent.press(getByText('Slept 7 hours'));
    expect(queryByTestId('trace-notes-8')).toBeNull();
  });

  it('tapping an expanded row collapses it and hides chips', () => {
    const entry = makeEntry({
      numericValue: null,
      entryTypeName: 'Food',
      labels: [
        { id: 10, entryTypeId: 3, name: 'Oats', parentId: null, categoryId: null, categoryName: null, sortOrder: 0 },
      ],
    });
    mockUseTraceEntries.mockReturnValue({
      sections: [makeSection('Today', [entry])],
      loading: false,
      error: null,
    });
    const { getByText, queryByText } = render(<TraceScreen />);
    fireEvent.press(getByText('Ate Oats'));
    expect(getByText('Oats')).toBeTruthy();
    fireEvent.press(getByText('Ate Oats'));
    expect(queryByText('Oats')).toBeNull();
  });

  describe('Focus pill long-press (item 3)', () => {
    it('long-pressing a focus pill navigates to the edit screen', async () => {
      const FOCUS = { id: 9, name: 'My Focus', description: null, archived: false, sortOrder: 0, createdAt: '2026-01-01T00:00:00-07:00' };
      mockUseFocuses.mockReturnValue({ focuses: [FOCUS], loading: false, error: null });
      mockUseTraceEntries.mockReturnValue({ sections: [], loading: false, error: null });
      const { getByTestId } = render(<TraceScreen />);
      fireEvent(getByTestId('focus-pill-9'), 'longPress');
      expect(mockRouterPush).toHaveBeenCalledWith('/focus/9/edit');
    });
  });

  describe('Tab re-tap resets filter (item 6)', () => {
    beforeEach(() => {
      tabPressCallback = undefined;
      mockIsFocused.mockReturnValue(true);
    });

    it('tabPress while focused resets selectedFocusId', async () => {
      const FOCUS = { id: 9, name: 'My Focus', description: null, archived: false, sortOrder: 0, createdAt: '2026-01-01T00:00:00-07:00' };
      mockUseFocuses.mockReturnValue({ focuses: [FOCUS], loading: false, error: null });

      const entry = makeEntry({ id: 1 });
      mockUseTraceEntries.mockReturnValue({
        sections: [makeSection('Today', [entry])],
        loading: false,
        error: null,
      });
      const { getByTestId, queryByTestId } = render(<TraceScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('focus-pill-9'));
      });
      // Filter is active — show-context button should be visible
      expect(getByTestId('show-context-1')).toBeTruthy();

      // Simulate tabPress
      act(() => { tabPressCallback?.(); });

      // After tabPress reset, show-context button should be gone (no filter active)
      await waitFor(() => {
        expect(queryByTestId('show-context-1')).toBeNull();
      });
    });

    it('tabPress while NOT focused does not reset the filter', async () => {
      mockIsFocused.mockReturnValue(false);
      const FOCUS = { id: 9, name: 'My Focus', description: null, archived: false, sortOrder: 0, createdAt: '2026-01-01T00:00:00-07:00' };
      mockUseFocuses.mockReturnValue({ focuses: [FOCUS], loading: false, error: null });

      const entry = makeEntry({ id: 1 });
      mockUseTraceEntries.mockReturnValue({
        sections: [makeSection('Today', [entry])],
        loading: false,
        error: null,
      });
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('focus-pill-9'));
      });
      expect(getByTestId('show-context-1')).toBeTruthy();

      // Simulate tabPress while NOT focused (first-visit navigation from another tab)
      act(() => { tabPressCallback?.(); });

      // Filter should remain active
      expect(getByTestId('show-context-1')).toBeTruthy();
    });
  });

  describe('Show context', () => {
    const FOCUS = { id: 9, name: 'My Focus', description: null, archived: false, sortOrder: 0, createdAt: '2026-01-01T00:00:00-07:00' };

    function setupWithFocus(entries: EntryWithLabels[]) {
      mockUseFocuses.mockReturnValue({ focuses: [FOCUS], loading: false, error: null });
      mockUseTraceEntries.mockReturnValue({
        sections: [makeSection('Today', entries)],
        loading: false,
        error: null,
      });
    }

    beforeEach(() => {
      const { getContextEntries } = require('@/lib/db/queries');
      (getContextEntries as jest.Mock).mockResolvedValue([]);
    });

    it('"Show context" button is absent when no filter is active', () => {
      const entry = makeEntry({ id: 1 });
      mockUseFocuses.mockReturnValue({ focuses: [FOCUS], loading: false, error: null });
      mockUseTraceEntries.mockReturnValue({
        sections: [makeSection('Today', [entry])],
        loading: false,
        error: null,
      });
      const { queryByTestId } = render(<TraceScreen />);
      expect(queryByTestId('show-context-1')).toBeNull();
    });

    it('"Show context" button is visible when a filter is active', async () => {
      const entry = makeEntry({ id: 1 });
      setupWithFocus([entry]);
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('focus-pill-9'));
      });
      expect(getByTestId('show-context-1')).toBeTruthy();
    });

    it('tapping "Show context" calls getContextEntries with entry id', async () => {
      const { getContextEntries } = require('@/lib/db/queries');
      const entry = makeEntry({ id: 1, timestamp: '2026-04-14T10:00:00-07:00' });
      setupWithFocus([entry]);
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('focus-pill-9'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('show-context-1'));
      });
      expect(getContextEntries).toHaveBeenCalled();
    });

    it('context entries render in muted container after tapping "Show context"', async () => {
      const contextEntry = makeEntry({ id: 99, entryTypeName: 'Food', entryTypeTitle: 'Food', timestamp: '2026-04-14T09:30:00-07:00', numericValue: null });
      const { getContextEntries } = require('@/lib/db/queries');
      (getContextEntries as jest.Mock).mockResolvedValue([contextEntry]);
      const entry = makeEntry({ id: 1, timestamp: '2026-04-14T10:00:00-07:00' });
      setupWithFocus([entry]);
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('focus-pill-9'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('show-context-1'));
      });
      await waitFor(() => expect(getByTestId('context-entries-1')).toBeTruthy());
    });

    it('context entry rows have muted style (opacity 0.7)', async () => {
      const contextEntry = makeEntry({ id: 99, entryTypeName: 'Food', entryTypeTitle: 'Food', timestamp: '2026-04-14T09:30:00-07:00', numericValue: null });
      const { getContextEntries } = require('@/lib/db/queries');
      (getContextEntries as jest.Mock).mockResolvedValue([contextEntry]);
      const entry = makeEntry({ id: 1, timestamp: '2026-04-14T10:00:00-07:00' });
      setupWithFocus([entry]);
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('focus-pill-9'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('show-context-1'));
      });
      await waitFor(() => {
        const contextRow = getByTestId('context-row-99');
        const style = contextRow.props.style;
        const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
        expect(flatStyle.opacity).toBe(0.7);
      });
    });

    it('"Hide context" button appears after context is shown', async () => {
      const entry = makeEntry({ id: 1, timestamp: '2026-04-14T10:00:00-07:00' });
      setupWithFocus([entry]);
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('focus-pill-9'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('show-context-1'));
      });
      await waitFor(() => expect(getByTestId('hide-context-1')).toBeTruthy());
    });

    it('tapping "Hide context" removes context entries', async () => {
      const contextEntry = makeEntry({ id: 99, entryTypeName: 'Food', entryTypeTitle: 'Food', timestamp: '2026-04-14T09:30:00-07:00', numericValue: null });
      const { getContextEntries } = require('@/lib/db/queries');
      (getContextEntries as jest.Mock).mockResolvedValue([contextEntry]);
      const entry = makeEntry({ id: 1, timestamp: '2026-04-14T10:00:00-07:00' });
      setupWithFocus([entry]);
      const { getByTestId, queryByTestId } = render(<TraceScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('focus-pill-9'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('show-context-1'));
      });
      await waitFor(() => expect(getByTestId('context-entries-1')).toBeTruthy());
      await act(async () => {
        fireEvent.press(getByTestId('hide-context-1'));
      });
      expect(queryByTestId('context-entries-1')).toBeNull();
    });

    it('changing focus pill clears all context entries', async () => {
      const FOCUS2 = { id: 10, name: 'Other Focus', description: null, archived: false, sortOrder: 1, createdAt: '2026-01-01T00:00:00-07:00' };
      const contextEntry = makeEntry({ id: 99, entryTypeName: 'Food', entryTypeTitle: 'Food', timestamp: '2026-04-14T09:30:00-07:00', numericValue: null });
      const { getContextEntries } = require('@/lib/db/queries');
      (getContextEntries as jest.Mock).mockResolvedValue([contextEntry]);
      const entry = makeEntry({ id: 1, timestamp: '2026-04-14T10:00:00-07:00' });
      mockUseFocuses.mockReturnValue({ focuses: [FOCUS, FOCUS2], loading: false, error: null });
      mockUseTraceEntries.mockReturnValue({
        sections: [makeSection('Today', [entry])],
        loading: false,
        error: null,
      });
      const { getByTestId, queryByTestId } = render(<TraceScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('focus-pill-9'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('show-context-1'));
      });
      await waitFor(() => expect(getByTestId('context-entries-1')).toBeTruthy());
      // Switch to a different focus pill — context should be cleared
      await act(async () => {
        fireEvent.press(getByTestId('focus-pill-10'));
      });
      expect(queryByTestId('context-entries-1')).toBeNull();
    });
  });
});
