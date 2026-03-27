import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useTraceEntries } from '@/hooks/useTraceEntries';
import type { EntryWithLabels } from '@/lib/db/query-types';
import type { TraceSection } from '@/lib/utils/traceUtils';

jest.mock('@/hooks/useTraceEntries');
jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useRouter: () => ({ back: jest.fn() }),
}));

const mockUseTraceEntries = useTraceEntries as jest.MockedFunction<typeof useTraceEntries>;

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
});
