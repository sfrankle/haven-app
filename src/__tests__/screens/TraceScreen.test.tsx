import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { useTraceEntries } from '@/hooks/useTraceEntries';
import { useFocuses } from '@/hooks/useFocuses';
import type { EntryWithLabels, RoutineCompletionGroup } from '@/lib/db/query-types';
import type { TraceItem, TraceSection } from '@/lib/utils/traceUtils';

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
    routineCompletionId: null,
    ...overrides,
  };
}

function makeSection(title: string, entries: EntryWithLabels[]): TraceSection {
  return { title, data: entries.map((entry) => ({ kind: 'entry', entry })) };
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

  describe('Routine group rows', () => {
    const FOCUS = { id: 9, name: 'My Focus', description: null, archived: false, sortOrder: 0, createdAt: '2026-01-01T00:00:00-07:00' };

    function makeGroup(overrides: Partial<RoutineCompletionGroup> = {}): RoutineCompletionGroup {
      return {
        completionId: 1,
        routineId: 1,
        routineName: 'Morning Flow',
        completedAt: '2026-03-25T08:12:00-07:00',
        localDate: '2026-03-25',
        entries: [],
        ...overrides,
      };
    }

    function sectionWith(items: TraceItem[]): TraceSection {
      return { title: 'Today', data: items };
    }

    const MEMBER_A = makeEntry({ id: 101, entryTypeName: 'Sleep', numericValue: 7 });
    const MEMBER_B = makeEntry({ id: 102, entryTypeName: 'Hydration', numericValue: 16 });

    function setupGroup(matchedIds: number[] = [101, 102]) {
      const group = makeGroup({ entries: [MEMBER_A, MEMBER_B] });
      mockUseFocuses.mockReturnValue({ focuses: [FOCUS], loading: false, error: null });
      mockUseTraceEntries.mockReturnValue({
        sections: [sectionWith([{ kind: 'group', group, matchedIds: new Set(matchedIds) }])],
        loading: false,
        error: null,
      });
      return group;
    }

    it('renders the routine name and completion time, with members hidden', () => {
      setupGroup();
      const { getByText, queryByText, getByTestId } = render(<TraceScreen />);
      expect(getByText('Morning Flow')).toBeTruthy();
      expect(getByText('8:12 AM')).toBeTruthy();
      expect(getByTestId('trace-group-icon-1')).toBeTruthy();
      expect(queryByText('Slept 7 hours')).toBeNull();
      expect(queryByText('Drank 16oz')).toBeNull();
    });

    it('tapping the group row reveals every member summary, tapping again hides them', () => {
      setupGroup();
      const { getByTestId, getByText, queryByText } = render(<TraceScreen />);

      fireEvent.press(getByTestId('trace-group-1'));
      expect(getByText('Slept 7 hours')).toBeTruthy();
      expect(getByText('Drank 16oz')).toBeTruthy();

      fireEvent.press(getByTestId('trace-group-1'));
      expect(queryByText('Slept 7 hours')).toBeNull();
    });

    it('group expansion and entry expansion with the same numeric id are independent', () => {
      // Key-space collision guard: completion 1 and entry 1 are different things.
      const group = makeGroup({ completionId: 1, entries: [MEMBER_A] });
      const entry = makeEntry({ id: 1, entryTypeName: 'Food', numericValue: null, labels: [
        { id: 10, entryTypeId: 3, name: 'Oats', parentId: null, categoryId: null, categoryName: null, sortOrder: 0 },
      ] });
      mockUseFocuses.mockReturnValue({ focuses: [], loading: false, error: null });
      mockUseTraceEntries.mockReturnValue({
        sections: [sectionWith([
          { kind: 'group', group, matchedIds: new Set([101]) },
          { kind: 'entry', entry },
        ])],
        loading: false,
        error: null,
      });

      const { getByTestId, getByText, queryByText } = render(<TraceScreen />);

      fireEvent.press(getByTestId('trace-group-1'));
      expect(getByText('Slept 7 hours')).toBeTruthy();
      // The entry with id 1 must NOT have expanded alongside it.
      expect(queryByText('Oats')).toBeNull();

      fireEvent.press(getByText('Ate Oats'));
      expect(getByText('Oats')).toBeTruthy();
      expect(getByText('Slept 7 hours')).toBeTruthy();
    });

    it('mutes members outside the matched set while a filter is active', async () => {
      setupGroup([101]);
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });
      fireEvent.press(getByTestId('trace-group-1'));

      const muted = getByTestId('trace-group-item-muted-102');
      const style = muted.props.style;
      const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
      expect(flatStyle.opacity).toBe(0.45);
      expect(getByTestId('trace-group-item-101')).toBeTruthy();
    });

    it('mutes nothing when no filter is active', () => {
      setupGroup([101]);
      const { getByTestId, queryByTestId } = render(<TraceScreen />);
      fireEvent.press(getByTestId('trace-group-1'));

      expect(queryByTestId('trace-group-item-muted-102')).toBeNull();
      expect(getByTestId('trace-group-item-102')).toBeTruthy();
    });

    it('offers no "Show context" affordance on a group or inside it', async () => {
      setupGroup();
      const { getByTestId, queryByTestId } = render(<TraceScreen />);
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });
      fireEvent.press(getByTestId('trace-group-1'));

      expect(queryByTestId('show-context-1')).toBeNull();
      expect(queryByTestId('show-context-101')).toBeNull();
      expect(queryByTestId('show-context-102')).toBeNull();
    });

    it('exposes the expanded state and item count to assistive tech', () => {
      setupGroup();
      const { getByTestId } = render(<TraceScreen />);
      const row = getByTestId('trace-group-1');
      expect(row.props.accessibilityLabel).toBe('Morning Flow, 8:12 AM, 2 items');
      expect(row.props.accessibilityState.expanded).toBe(false);

      fireEvent.press(row);
      expect(getByTestId('trace-group-1').props.accessibilityState.expanded).toBe(true);
    });

    it('says "1 item", not "1 items", for a single-member routine', () => {
      const group = makeGroup({ entries: [MEMBER_A] });
      mockUseFocuses.mockReturnValue({ focuses: [FOCUS], loading: false, error: null });
      mockUseTraceEntries.mockReturnValue({
        sections: [sectionWith([{ kind: 'group', group, matchedIds: new Set([101]) }])],
        loading: false,
        error: null,
      });

      const { getByTestId } = render(<TraceScreen />);
      expect(getByTestId('trace-group-1').props.accessibilityLabel).toBe(
        'Morning Flow, 8:12 AM, 1 item',
      );
    });
  });

  describe('Multi-focus filter selection', () => {
    const FOCUS_A = { id: 9, name: 'Focus A', description: null, archived: false, sortOrder: 0, createdAt: '2026-01-01T00:00:00-07:00' };
    const FOCUS_B = { id: 10, name: 'Focus B', description: null, archived: false, sortOrder: 1, createdAt: '2026-01-01T00:00:00-07:00' };

    function lastFocusIds(): number[] {
      const calls = mockUseTraceEntries.mock.calls;
      return calls[calls.length - 1][0] as number[];
    }

    beforeEach(() => {
      mockUseFocuses.mockReturnValue({ focuses: [FOCUS_A, FOCUS_B], loading: false, error: null });
      mockUseTraceEntries.mockReturnValue({
        sections: [makeSection('Today', [makeEntry({ id: 1 })])],
        loading: false,
        error: null,
      });
    });

    it('starts with no filters active', () => {
      render(<TraceScreen />);
      expect(lastFocusIds()).toEqual([]);
    });

    it('two focus pills can be selected at the same time', async () => {
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });
      await act(async () => { fireEvent.press(getByTestId('focus-pill-10')); });

      expect(getByTestId('focus-pill-9').props.accessibilityState.selected).toBe(true);
      expect(getByTestId('focus-pill-10').props.accessibilityState.selected).toBe(true);
      expect(lastFocusIds()).toEqual([9, 10]);
    });

    it('tapping a selected pill deselects only that pill', async () => {
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });
      await act(async () => { fireEvent.press(getByTestId('focus-pill-10')); });
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });

      expect(getByTestId('focus-pill-9').props.accessibilityState.selected).toBe(false);
      expect(getByTestId('focus-pill-10').props.accessibilityState.selected).toBe(true);
      expect(lastFocusIds()).toEqual([10]);
    });

    it('tab re-tap clears all active filters', async () => {
      tabPressCallback = undefined;
      mockIsFocused.mockReturnValue(true);
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });
      await act(async () => { fireEvent.press(getByTestId('focus-pill-10')); });
      expect(lastFocusIds()).toEqual([9, 10]);

      act(() => { tabPressCallback?.(); });

      await waitFor(() => expect(lastFocusIds()).toEqual([]));
    });

    it('empty state names a single Focus when one filter is active', async () => {
      mockUseTraceEntries.mockReturnValue({ sections: [], loading: false, error: null });
      const { getByTestId, getByText } = render(<TraceScreen />);
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });
      expect(getByText('No entries for this Focus yet.')).toBeTruthy();
    });

    it('empty state pluralises when two filters are active', async () => {
      mockUseTraceEntries.mockReturnValue({ sections: [], loading: false, error: null });
      const { getByTestId, getByText } = render(<TraceScreen />);
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });
      await act(async () => { fireEvent.press(getByTestId('focus-pill-10')); });
      expect(getByText('No entries for these Focuses yet.')).toBeTruthy();
    });
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

    it('tabPress while focused resets the active filters', async () => {
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

  describe('Show context (context view mode)', () => {
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

    it('tapping "Show context" switches to context view (context-view testID appears)', async () => {
      const contextEntry = makeEntry({ id: 99, entryTypeName: 'Food', entryTypeTitle: 'Food', timestamp: '2026-04-14T09:30:00-07:00', numericValue: null, labels: [] });
      const { getContextEntries } = require('@/lib/db/queries');
      (getContextEntries as jest.Mock).mockResolvedValue([contextEntry]);
      const entry = makeEntry({ id: 1, timestamp: '2026-04-14T10:00:00-07:00' });
      setupWithFocus([entry]);
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });
      await act(async () => { fireEvent.press(getByTestId('show-context-1')); });
      await waitFor(() => expect(getByTestId('context-view')).toBeTruthy());
    });

    it('context view shows the focal entry with glow border', async () => {
      const { getContextEntries } = require('@/lib/db/queries');
      (getContextEntries as jest.Mock).mockResolvedValue([]);
      const entry = makeEntry({ id: 1, timestamp: '2026-04-14T10:00:00-07:00' });
      setupWithFocus([entry]);
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });
      await act(async () => { fireEvent.press(getByTestId('show-context-1')); });
      await waitFor(() => {
        const focalRow = getByTestId('context-view-focal-1');
        const style = focalRow.props.style;
        const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
        expect(flatStyle.borderLeftWidth).toBe(2);
      });
    });

    it('non-focus context entries are muted (opacity ~0.45)', async () => {
      const contextEntry = makeEntry({ id: 99, entryTypeName: 'Food', entryTypeTitle: 'Food', timestamp: '2026-04-14T09:30:00-07:00', numericValue: null, labels: [] });
      const { getContextEntries } = require('@/lib/db/queries');
      (getContextEntries as jest.Mock).mockResolvedValue([contextEntry]);
      const entry = makeEntry({ id: 1, timestamp: '2026-04-14T10:00:00-07:00' });
      setupWithFocus([entry]);
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });
      await act(async () => { fireEvent.press(getByTestId('show-context-1')); });
      await waitFor(() => {
        const mutedRow = getByTestId('context-view-muted-99');
        const style = mutedRow.props.style;
        const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
        expect(flatStyle.opacity).toBe(0.45);
      });
    });

    it('"Back to filter" dismiss button appears in context view', async () => {
      const entry = makeEntry({ id: 1, timestamp: '2026-04-14T10:00:00-07:00' });
      setupWithFocus([entry]);
      const { getByTestId } = render(<TraceScreen />);
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });
      await act(async () => { fireEvent.press(getByTestId('show-context-1')); });
      await waitFor(() => expect(getByTestId('context-view-dismiss')).toBeTruthy());
    });

    it('tapping "Back to filter" restores the filtered SectionList', async () => {
      const entry = makeEntry({ id: 1, timestamp: '2026-04-14T10:00:00-07:00' });
      setupWithFocus([entry]);
      const { getByTestId, queryByTestId } = render(<TraceScreen />);
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });
      await act(async () => { fireEvent.press(getByTestId('show-context-1')); });
      await waitFor(() => expect(getByTestId('context-view')).toBeTruthy());
      fireEvent.press(getByTestId('context-view-dismiss'));
      expect(queryByTestId('context-view')).toBeNull();
      // The filter is still active — show-context button should reappear
      expect(getByTestId('show-context-1')).toBeTruthy();
    });

    it('changing focus pill exits context view', async () => {
      const FOCUS2 = { id: 10, name: 'Other Focus', description: null, archived: false, sortOrder: 1, createdAt: '2026-01-01T00:00:00-07:00' };
      const entry = makeEntry({ id: 1, timestamp: '2026-04-14T10:00:00-07:00' });
      mockUseFocuses.mockReturnValue({ focuses: [FOCUS, FOCUS2], loading: false, error: null });
      mockUseTraceEntries.mockReturnValue({
        sections: [makeSection('Today', [entry])],
        loading: false,
        error: null,
      });
      const { getByTestId, queryByTestId } = render(<TraceScreen />);
      await act(async () => { fireEvent.press(getByTestId('focus-pill-9')); });
      await act(async () => { fireEvent.press(getByTestId('show-context-1')); });
      await waitFor(() => expect(getByTestId('context-view')).toBeTruthy());
      await act(async () => { fireEvent.press(getByTestId('focus-pill-10')); });
      expect(queryByTestId('context-view')).toBeNull();
    });
  });
});
