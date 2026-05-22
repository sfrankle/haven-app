import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { FocusDropdown } from '../FocusDropdown';

// Mock expo-router (useFocusEffect inside useFocuses)
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => { cb(); },
}));

// Mock useFocuses hook entirely
jest.mock('@/hooks/useFocuses', () => ({
  useFocuses: jest.fn(),
}));

// Mock db for createFocus
jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/lib/db/queries', () => ({
  createFocus: jest.fn(),
}));

// eslint-disable-next-line import/first
import { useFocuses } from '@/hooks/useFocuses';
// eslint-disable-next-line import/first
import * as queries from '@/lib/db/queries';

const mockUseFocuses = jest.mocked(useFocuses);
const mockCreateFocus = jest.mocked(queries.createFocus);

const FOCUSES = [
  { id: 1, name: 'Gut health', description: null, archived: false, sortOrder: 0, createdAt: '' },
  { id: 2, name: 'Energy', description: null, archived: false, sortOrder: 1, createdAt: '' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseFocuses.mockReturnValue({ focuses: FOCUSES, loading: false, error: null });
});

describe('FocusDropdown', () => {
  it('is collapsed by default', () => {
    const { queryByTestId } = render(
      <FocusDropdown selectedId={undefined} onSelect={jest.fn()} />
    );
    expect(queryByTestId('focus-option-1')).toBeNull();
    expect(queryByTestId('focus-option-2')).toBeNull();
  });

  it('expands when toggle is tapped', () => {
    const { getByTestId } = render(
      <FocusDropdown selectedId={undefined} onSelect={jest.fn()} />
    );
    fireEvent.press(getByTestId('focus-toggle'));
    expect(getByTestId('focus-option-1')).toBeTruthy();
    expect(getByTestId('focus-option-2')).toBeTruthy();
  });

  it('calls onSelect with focus id when an option is tapped', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <FocusDropdown selectedId={undefined} onSelect={onSelect} />
    );
    fireEvent.press(getByTestId('focus-toggle'));
    fireEvent.press(getByTestId('focus-option-1'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('calls onSelect with undefined when already-selected focus is tapped', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <FocusDropdown selectedId={1} onSelect={onSelect} />
    );
    fireEvent.press(getByTestId('focus-toggle'));
    fireEvent.press(getByTestId('focus-option-1'));
    expect(onSelect).toHaveBeenCalledWith(undefined);
  });

  it('auto-expands when defaultExpanded is true', () => {
    const { getByTestId } = render(
      <FocusDropdown selectedId={2} onSelect={jest.fn()} defaultExpanded />
    );
    // Should be expanded without needing to tap toggle
    expect(getByTestId('focus-option-1')).toBeTruthy();
    expect(getByTestId('focus-option-2')).toBeTruthy();
  });

  it('tapping + New Focus opens modal', () => {
    const { getByTestId } = render(
      <FocusDropdown selectedId={undefined} onSelect={jest.fn()} />
    );
    fireEvent.press(getByTestId('focus-toggle'));
    fireEvent.press(getByTestId('focus-new'));
    expect(getByTestId('focus-new-modal')).toBeTruthy();
  });

  it('modal submit calls createFocus and onSelect with new id', async () => {
    const newFocus = { id: 99, name: 'New thing', description: null, archived: false, sortOrder: 0, createdAt: '' };
    mockCreateFocus.mockResolvedValue(newFocus);

    const onSelect = jest.fn();
    const { getByTestId } = render(
      <FocusDropdown selectedId={undefined} onSelect={onSelect} />
    );

    fireEvent.press(getByTestId('focus-toggle'));
    fireEvent.press(getByTestId('focus-new'));
    fireEvent.changeText(getByTestId('focus-new-name-input'), 'New thing');

    await act(async () => {
      fireEvent.press(getByTestId('focus-new-submit'));
    });

    expect(mockCreateFocus).toHaveBeenCalledWith(expect.anything(), { name: 'New thing' });
    expect(onSelect).toHaveBeenCalledWith(99);
  });

  it('modal cancel closes without calling createFocus', () => {
    const { getByTestId, queryByTestId } = render(
      <FocusDropdown selectedId={undefined} onSelect={jest.fn()} />
    );
    fireEvent.press(getByTestId('focus-toggle'));
    fireEvent.press(getByTestId('focus-new'));
    fireEvent.press(getByTestId('focus-new-cancel'));
    expect(mockCreateFocus).not.toHaveBeenCalled();
    expect(queryByTestId('focus-new-modal')).toBeNull();
  });

  it('shows duplicate-name error when createFocus rejects with UNIQUE constraint', async () => {
    mockCreateFocus.mockRejectedValue(new Error('UNIQUE constraint failed: focus.name'));
    const { getByTestId } = render(
      <FocusDropdown selectedId={undefined} onSelect={jest.fn()} />
    );
    fireEvent.press(getByTestId('focus-toggle'));
    fireEvent.press(getByTestId('focus-new'));
    fireEvent.changeText(getByTestId('focus-new-name-input'), 'Gut health');
    await act(async () => {
      fireEvent.press(getByTestId('focus-new-submit'));
    });
    expect(getByTestId('focus-error-message').props.children).toBe(
      'A focus with that name already exists.'
    );
    // Modal stays open
    expect(getByTestId('focus-new-name-input')).toBeTruthy();
  });

  it('shows generic error when createFocus rejects with unknown error', async () => {
    mockCreateFocus.mockRejectedValue(new Error('disk full'));
    const { getByTestId } = render(
      <FocusDropdown selectedId={undefined} onSelect={jest.fn()} />
    );
    fireEvent.press(getByTestId('focus-toggle'));
    fireEvent.press(getByTestId('focus-new'));
    fireEvent.changeText(getByTestId('focus-new-name-input'), 'Some focus');
    await act(async () => {
      fireEvent.press(getByTestId('focus-new-submit'));
    });
    expect(getByTestId('focus-error-message').props.children).toBe(
      'Something went wrong. Please try again.'
    );
  });

  it('clears error when user edits the input after an error', async () => {
    mockCreateFocus.mockRejectedValue(new Error('UNIQUE constraint failed: focus.name'));
    const { getByTestId, queryByTestId } = render(
      <FocusDropdown selectedId={undefined} onSelect={jest.fn()} />
    );
    fireEvent.press(getByTestId('focus-toggle'));
    fireEvent.press(getByTestId('focus-new'));
    fireEvent.changeText(getByTestId('focus-new-name-input'), 'Gut health');
    await act(async () => {
      fireEvent.press(getByTestId('focus-new-submit'));
    });
    expect(getByTestId('focus-error-message')).toBeTruthy();
    fireEvent.changeText(getByTestId('focus-new-name-input'), 'Gut health 2');
    expect(queryByTestId('focus-error-message')).toBeNull();
  });

  it('New Focus modal renders KeyboardAvoidingView', () => {
    const { getByTestId } = render(
      <FocusDropdown selectedId={undefined} onSelect={jest.fn()} />
    );
    fireEvent.press(getByTestId('focus-toggle'));
    fireEvent.press(getByTestId('focus-new'));
    // The modal sheet should be wrapped in a KeyboardAvoidingView (testID="focus-modal-kav")
    expect(getByTestId('focus-modal-kav')).toBeTruthy();
  });

  it('FocusDropdown accepts style prop and applies it to root View', () => {
    const { getByTestId } = render(
      <FocusDropdown
        selectedId={undefined}
        onSelect={jest.fn()}
        testID="my-focus-dropdown"
        style={{ paddingHorizontal: 16 }}
      />
    );
    const root = getByTestId('my-focus-dropdown');
    const flatStyle = Array.isArray(root.props.style)
      ? Object.assign({}, ...root.props.style)
      : root.props.style;
    expect(flatStyle.paddingHorizontal).toBe(16);
  });

  it('modal input clears after close', async () => {
    mockCreateFocus.mockResolvedValue({
      id: 100, name: 'Temp', description: null, archived: false, sortOrder: 0, createdAt: '',
    });
    const { getByTestId } = render(
      <FocusDropdown selectedId={undefined} onSelect={jest.fn()} />
    );
    fireEvent.press(getByTestId('focus-toggle'));
    fireEvent.press(getByTestId('focus-new'));
    fireEvent.changeText(getByTestId('focus-new-name-input'), 'Temp');
    await act(async () => {
      fireEvent.press(getByTestId('focus-new-submit'));
    });
    // Re-open modal
    fireEvent.press(getByTestId('focus-new'));
    expect(getByTestId('focus-new-name-input').props.value).toBe('');
  });
});
