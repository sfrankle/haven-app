import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import type { EntryType, Label } from '@/lib/db/query-types';
import type { PhysicalStateLabel } from '@/lib/db/query-types';
import { useEntryTypes } from '@/hooks';
import * as queries from '@/lib/db/queries';
import * as timestamp from '@/lib/utils/timestamp';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: mockReplace, push: jest.fn() }),
  useFocusEffect: (cb: () => void) => { cb(); },
}));

jest.mock('@/hooks', () => ({
  useEntryTypes: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  getPhysicalStateLabels: jest.fn(),
  getPhysicalParentLabels: jest.fn(),
  saveEntry: jest.fn(),
  saveEntryBatch: jest.fn(),
  createLabel: jest.fn(),
  createFocus: jest.fn(),
}));

jest.mock('@/lib/utils/timestamp', () => ({
  nowLocalIso: jest.fn(),
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/hooks/useFocuses', () => ({
  useFocuses: () => ({ focuses: [], loading: false, error: null }),
}));

const mockReplace = jest.fn();

const PHYSICAL_ENTRY_TYPE: EntryType = {
  id: 7,
  name: 'Physical',
  title: 'Attune',
  icon: 'body',
  prompt: 'How does your body feel?',
  measurementType: 'label_select_severity',
};

const FIXTURE_ENTRY_TYPES: EntryType[] = [PHYSICAL_ENTRY_TYPE];

const FIXED_ISO = '2026-03-14T10:00:00-07:00';

function makeStateLabel(
  id: number,
  name: string,
  parentName: string | null,
  parentId: number | null = 1
): PhysicalStateLabel {
  return {
    id,
    entryTypeId: 7,
    name,
    parentId,
    categoryId: null,
    categoryName: null,
    sortOrder: id * 10,
    parentName,
  };
}

function makeParentLabel(id: number, name: string): Label {
  return {
    id,
    entryTypeId: 7,
    name,
    parentId: null,
    categoryId: null,
    categoryName: null,
    sortOrder: id * 10,
  };
}

const ENERGY_PARENT = makeParentLabel(1, 'Energy');
const GUT_PARENT = makeParentLabel(2, 'Gut');

const CRAMPING_LABEL = makeStateLabel(10, 'Cramping', 'Gut', 2);
const BLOATING_LABEL = makeStateLabel(11, 'Bloating', 'Gut', 2);
const ACHY_LABEL = makeStateLabel(12, 'Achy', 'Whole body', 3);

// Import screen after mocks are set up.
// eslint-disable-next-line import/first
import LogPhysicalScreen from '../../../app/(tabs)/(tend)/log/physical';

describe('LogPhysicalScreen', () => {
  const mockUseEntryTypes = jest.mocked(useEntryTypes);
  const mockGetPhysicalStateLabels = jest.mocked(queries.getPhysicalStateLabels);
  const mockGetPhysicalParentLabels = jest.mocked(queries.getPhysicalParentLabels);
  const mockSaveEntry = jest.mocked(queries.saveEntry);
  const mockSaveEntryBatch = jest.mocked(queries.saveEntryBatch);
  const mockCreateLabel = jest.mocked(queries.createLabel);
  const mockNowLocalIso = jest.mocked(timestamp.nowLocalIso);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseEntryTypes.mockReturnValue({
      entryTypes: FIXTURE_ENTRY_TYPES,
      loading: false,
      error: null,
    });
    mockGetPhysicalStateLabels.mockResolvedValue([CRAMPING_LABEL, BLOATING_LABEL, ACHY_LABEL]);
    mockGetPhysicalParentLabels.mockResolvedValue([ENERGY_PARENT, GUT_PARENT]);
    mockSaveEntry.mockResolvedValue(1);
    mockSaveEntryBatch.mockResolvedValue([1]);
    mockCreateLabel.mockResolvedValue({
      id: 99,
      entryTypeId: 7,
      name: 'Custom state',
      parentId: null,
      categoryId: null,
      categoryName: null,
      sortOrder: 0,
    });
    mockNowLocalIso.mockReturnValue(FIXED_ISO);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the prompt text', async () => {
    const { getByText } = render(<LogPhysicalScreen />);
    await waitFor(() => expect(getByText('How does your body feel?')).toBeTruthy());
  });

  it('renders the energy slider', async () => {
    const { getByTestId } = render(<LogPhysicalScreen />);
    expect(getByTestId('energy-slider')).toBeTruthy();
  });

  // Unlike Food and Activity, where search is the only input, Physical can be
  // submitted from Energy alone (docs/design/interaction.md). Autofocusing the
  // search box would presume symptom intent and put the keyboard over the
  // slider, so this screen opts out.
  it('does not autofocus the search box, leaving the energy slider reachable', async () => {
    const { getByTestId } = render(<LogPhysicalScreen />);
    expect(getByTestId('physical-search').props.autoFocus).toBe(false);
  });

  it('setting energy slider adds energy chip to tray', async () => {
    const { getByTestId, getByLabelText } = render(<LogPhysicalScreen />);
    fireEvent(getByLabelText('Energy level'), 'onValueChange', 3);
    await waitFor(() => expect(getByTestId('physical-chip-energy')).toBeTruthy());
  });

  it('energy chip label shows "Energy: N/5"', async () => {
    const { getByTestId, getByLabelText } = render(<LogPhysicalScreen />);
    fireEvent(getByLabelText('Energy level'), 'onValueChange', 5);
    await waitFor(() => {
      const chip = getByTestId('physical-chip-energy');
      expect(chip).toBeTruthy();
      expect(chip.props.accessibilityLabel).toBe('Energy: 5/5');
    });
  });

  it('selecting a state suggestion adds chip with area prefix', async () => {
    const { getByTestId, queryByTestId } = render(<LogPhysicalScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    fireEvent.press(getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    const chip = queryByTestId(`physical-chip-${CRAMPING_LABEL.id}`);
    expect(chip).toBeTruthy();
    expect(chip?.props.accessibilityLabel).toMatch(/^Gut: Cramping/);
  });

  it('whole-body state chip has no area prefix', async () => {
    const { getByTestId, queryByTestId } = render(<LogPhysicalScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId(`physical-suggestion-${ACHY_LABEL.id}`));
    fireEvent.press(getByTestId(`physical-suggestion-${ACHY_LABEL.id}`));
    const chip = queryByTestId(`physical-chip-${ACHY_LABEL.id}`);
    expect(chip).toBeTruthy();
    expect(chip?.props.accessibilityLabel).toBe('Achy');
  });

  it('state chip without severity shows severity icon (···)', async () => {
    const { getByTestId } = render(<LogPhysicalScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    fireEvent.press(getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    await waitFor(() => {
      expect(
        getByTestId(`physical-chip-${CRAMPING_LABEL.id}-severity-icon`)
      ).toBeTruthy();
    });
  });

  it('tapping severity icon opens severity row', async () => {
    const { getByTestId } = render(<LogPhysicalScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    fireEvent.press(getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    fireEvent.press(getByTestId(`physical-chip-${CRAMPING_LABEL.id}-severity-icon`));
    await waitFor(() => expect(getByTestId('physical-severity-row')).toBeTruthy());
  });

  it('setting severity updates chip label to include severity', async () => {
    const { getByTestId, getByText } = render(<LogPhysicalScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    fireEvent.press(getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    fireEvent.press(getByTestId(`physical-chip-${CRAMPING_LABEL.id}-severity-icon`));
    await waitFor(() => getByTestId('physical-severity-row'));
    fireEvent.press(getByText('3'));
    await waitFor(() => {
      const chip = getByTestId(`physical-chip-${CRAMPING_LABEL.id}`);
      expect(chip.props.accessibilityLabel).toMatch(/\(3\/5\)/);
    });
  });

  it('submit button is hidden when no chips are selected', async () => {
    const { queryByTestId } = render(<LogPhysicalScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    expect(queryByTestId('physical-save-button')).toBeNull();
  });

  it('submit button appears when energy is set', async () => {
    const { getByTestId, getByLabelText } = render(<LogPhysicalScreen />);
    fireEvent(getByLabelText('Energy level'), 'onValueChange', 1);
    await waitFor(() => expect(getByTestId('physical-save-button')).toBeTruthy());
  });

  it('submit button appears when at least one state chip is selected', async () => {
    const { getByTestId } = render(<LogPhysicalScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    fireEvent.press(getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    expect(getByTestId('physical-save-button')).toBeTruthy();
  });

  it('energy-only submit saves one entry with Energy label and numeric_value', async () => {
    const { getByTestId, getByLabelText } = render(<LogPhysicalScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => {});
    fireEvent(getByLabelText('Energy level'), 'onValueChange', 2);
    await act(async () => {
      fireEvent.press(getByTestId('physical-save-button'));
    });
    expect(mockSaveEntryBatch).toHaveBeenCalledTimes(1);
    expect(mockSaveEntryBatch).toHaveBeenCalledWith(expect.anything(), [
      expect.objectContaining({
        entryTypeId: PHYSICAL_ENTRY_TYPE.id,
        numericValue: 2,
        labelIds: [ENERGY_PARENT.id],
        timestamp: FIXED_ISO,
      }),
    ]);
  });

  it('state-only submit saves one entry carrying that chip label', async () => {
    const { getByTestId } = render(<LogPhysicalScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    fireEvent.press(getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    await act(async () => {
      fireEvent.press(getByTestId('physical-save-button'));
    });
    expect(mockSaveEntryBatch).toHaveBeenCalledTimes(1);
    expect(mockSaveEntryBatch).toHaveBeenCalledWith(expect.anything(), [
      expect.objectContaining({
        entryTypeId: PHYSICAL_ENTRY_TYPE.id,
        labelIds: [CRAMPING_LABEL.id],
        timestamp: FIXED_ISO,
      }),
    ]);
  });

  // Severity 0 means "symptom absent today" and is a real, meaningful value —
  // not the absence of one. It is also falsy, so `chip.severity ?? undefined`
  // in physical.tsx is load-bearing: switching it to `|| undefined` would
  // silently drop every "absent" reading on the way to the database while every
  // other test still passed. This is the only test that would catch that.
  //
  // It exists because maestro/flows/tend/log-physical-severity-zero.yaml was
  // deleted — the severity row auto-dismisses after 2000ms by design
  // (docs/design/interaction.md), which no E2E runner can reliably hit. The
  // rendering and label are covered in SeverityRow.test.tsx and
  // physical-chip-label.test.ts; this covers the save path they do not reach.
  it('severity 0 reaches the save call as numericValue 0, not undefined', async () => {
    const { getByTestId, getByText } = render(<LogPhysicalScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    fireEvent.press(getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));

    fireEvent.press(getByTestId(`physical-chip-${CRAMPING_LABEL.id}-severity-icon`));
    await waitFor(() => getByTestId('physical-severity-row'));
    fireEvent.press(getByText('0'));

    await waitFor(() => {
      const chip = getByTestId(`physical-chip-${CRAMPING_LABEL.id}`);
      expect(chip.props.accessibilityLabel).toMatch(/\(absent\)/);
    });

    await act(async () => {
      fireEvent.press(getByTestId('physical-save-button'));
    });

    expect(mockSaveEntryBatch).toHaveBeenCalledTimes(1);
    expect(mockSaveEntryBatch).toHaveBeenCalledWith(expect.anything(), [
      expect.objectContaining({
        entryTypeId: PHYSICAL_ENTRY_TYPE.id,
        numericValue: 0,
        labelIds: [CRAMPING_LABEL.id],
        timestamp: FIXED_ISO,
      }),
    ]);
  });

  // Regression: multiple chips used to fire one saveEntry per chip through
  // Promise.all. Each opened its own transaction on the shared connection, so
  // the second BEGIN threw "cannot start a transaction within a transaction"
  // and the whole save failed. One batch call, one transaction.
  it('multiple chips save in a single batched call sharing one timestamp', async () => {
    const { getByTestId, getByLabelText } = render(<LogPhysicalScreen />);
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    // Select energy + 2 state chips
    fireEvent(getByLabelText('Energy level'), 'onValueChange', 1);
    fireEvent.press(getByTestId(`physical-suggestion-${CRAMPING_LABEL.id}`));
    await waitFor(() => getByTestId(`physical-suggestion-${BLOATING_LABEL.id}`));
    fireEvent.press(getByTestId(`physical-suggestion-${BLOATING_LABEL.id}`));
    await act(async () => {
      fireEvent.press(getByTestId('physical-save-button'));
    });

    expect(mockSaveEntry).not.toHaveBeenCalled();
    expect(mockSaveEntryBatch).toHaveBeenCalledTimes(1);

    const inputs = mockSaveEntryBatch.mock.calls[0][1];
    expect(inputs).toHaveLength(3);
    expect(inputs.map((i) => i.labelIds)).toEqual([
      [ENERGY_PARENT.id],
      [CRAMPING_LABEL.id],
      [BLOATING_LABEL.id],
    ]);
    expect(inputs.every((i) => i.timestamp === FIXED_ISO)).toBe(true);
  });

  it('shows save confirmation after submit', async () => {
    const { getByTestId, getByLabelText } = render(<LogPhysicalScreen />);
    fireEvent(getByLabelText('Energy level'), 'onValueChange', 1);
    await act(async () => {
      fireEvent.press(getByTestId('physical-save-button'));
    });
    expect(getByTestId('physical-save-confirmation')).toBeTruthy();
  });

  it('shows "+ Add" when search has no results', async () => {
    mockGetPhysicalStateLabels.mockResolvedValue([]);
    const { getByTestId, queryByTestId } = render(<LogPhysicalScreen />);
    fireEvent.changeText(getByTestId('physical-search'), 'ZzCustomXx');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => expect(queryByTestId('physical-add-custom')).toBeTruthy());
  });

  it('tapping "+ Add" calls createLabel and adds chip', async () => {
    mockGetPhysicalStateLabels.mockResolvedValue([]);
    const { getByTestId } = render(<LogPhysicalScreen />);
    fireEvent.changeText(getByTestId('physical-search'), 'Custom state');
    act(() => { jest.advanceTimersByTime(200); });
    await waitFor(() => getByTestId('physical-add-custom'));
    await act(async () => {
      fireEvent.press(getByTestId('physical-add-custom'));
    });
    expect(mockCreateLabel).toHaveBeenCalledWith(
      expect.anything(),
      PHYSICAL_ENTRY_TYPE.id,
      'Custom state'
    );
    await waitFor(() => expect(getByTestId('physical-chip-99')).toBeTruthy());
  });
});
