import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { LogFormShell } from '../LogFormShell';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => { cb(); },
}));

// Mock FocusDropdown to isolate LogFormShell tests
jest.mock('../FocusDropdown', () => ({
  FocusDropdown: ({ onSelect, testID }: { onSelect: (id: number | undefined) => void; testID?: string; defaultExpanded?: boolean }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        testID={testID ?? 'focus-dropdown'}
        onPress={() => onSelect(42)}
        accessibilityRole="button"
      >
        <Text>Focus</Text>
      </Pressable>
    );
  },
}));

// Suppress animated warnings in test env
jest.useFakeTimers();

describe('LogFormShell', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('hides save button when canSubmit is false', () => {
    const { queryByTestId } = render(
      <LogFormShell canSubmit={false} onSave={jest.fn()} saveButtonTestID="save-btn" />
    );
    expect(queryByTestId('save-btn')).toBeNull();
  });

  it('shows save button when canSubmit is true', () => {
    const { getByTestId } = render(
      <LogFormShell canSubmit={true} onSave={jest.fn()} saveButtonTestID="save-btn" />
    );
    expect(getByTestId('save-btn')).toBeTruthy();
  });

  it('disables button while onSave is in flight and re-enables after resolution', async () => {
    let resolve!: () => void;
    const slowSave = jest.fn(
      () => new Promise<void>((r) => { resolve = r; })
    );

    const { getByTestId } = render(
      <LogFormShell canSubmit={true} onSave={slowSave} saveButtonTestID="save-btn" />
    );

    const btn = getByTestId('save-btn');
    fireEvent.press(btn);

    // In-flight: button should be disabled
    expect(btn.props.accessibilityState?.disabled).toBe(true);

    // Resolve the save
    await act(async () => { resolve(); });

    // After resolution button is enabled again
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });

  it('does not call onSave a second time if tapped while in flight', async () => {
    let resolve!: () => void;
    const slowSave = jest.fn(
      () => new Promise<void>((r) => { resolve = r; })
    );

    const { getByTestId } = render(
      <LogFormShell canSubmit={true} onSave={slowSave} saveButtonTestID="save-btn" />
    );

    const btn = getByTestId('save-btn');
    fireEvent.press(btn);
    fireEvent.press(btn); // second tap while in flight

    expect(slowSave).toHaveBeenCalledTimes(1);

    await act(async () => { resolve(); });
  });

  it('passes notes value to onSave', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    const { getByTestId } = render(
      <LogFormShell
        canSubmit={true}
        onSave={onSave}
        saveButtonTestID="save-btn"
        notesTestID="notes-input"
      />
    );

    fireEvent.changeText(getByTestId('notes-input'), 'felt great today');

    await act(async () => {
      fireEvent.press(getByTestId('save-btn'));
    });

    expect(onSave).toHaveBeenCalledWith({ notes: 'felt great today', focusId: undefined });
  });

  it('normalises empty notes to undefined', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    const { getByTestId } = render(
      <LogFormShell canSubmit={true} onSave={onSave} saveButtonTestID="save-btn" notesTestID="notes-input" />
    );

    // Leave notes empty, press save
    await act(async () => {
      fireEvent.press(getByTestId('save-btn'));
    });

    expect(onSave).toHaveBeenCalledWith({ notes: undefined, focusId: undefined });
  });

  it('shows error message when onSave rejects', async () => {
    const failingSave = jest.fn().mockRejectedValue(new Error('db error'));

    const { getByTestId } = render(
      <LogFormShell
        canSubmit={true}
        onSave={failingSave}
        saveButtonTestID="save-btn"
        errorTestID="save-error"
      />
    );

    await act(async () => {
      fireEvent.press(getByTestId('save-btn'));
    });

    expect(getByTestId('save-error')).toBeTruthy();
  });

  it('clears error message when Save is pressed again after rejection', async () => {
    let callCount = 0;
    const onSave = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('db error'));
      return Promise.resolve();
    });

    const { getByTestId, queryByTestId } = render(
      <LogFormShell
        canSubmit={true}
        onSave={onSave}
        saveButtonTestID="save-btn"
        errorTestID="save-error"
      />
    );

    // First press — fails
    await act(async () => {
      fireEvent.press(getByTestId('save-btn'));
    });
    expect(getByTestId('save-error')).toBeTruthy();

    // Second press — succeeds; error should clear
    await act(async () => {
      fireEvent.press(getByTestId('save-btn'));
    });
    expect(queryByTestId('save-error')).toBeNull();
  });

  it('shows SaveConfirmation after successful save', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    const { getByTestId } = render(
      <LogFormShell
        canSubmit={true}
        onSave={onSave}
        saveButtonTestID="save-btn"
        confirmationTestID="save-confirmation"
      />
    );

    await act(async () => {
      fireEvent.press(getByTestId('save-btn'));
    });

    expect(getByTestId('save-confirmation')).toBeTruthy();
  });

  // Physical-specific: notes attached to every saveEntry call
  it('passes notes to onSave for Physical multi-row scenario', async () => {
    // This mirrors physical.tsx's handleSave which receives extras and
    // attaches notes to every saveEntry call in the loop.
    const calls: { notes: string | undefined }[] = [];
    const onSave = jest.fn().mockImplementation(async (extras: { notes?: string }) => {
      // Simulate a multi-row save by recording extras twice (as physical does)
      calls.push({ notes: extras.notes });
      calls.push({ notes: extras.notes });
    });

    const { getByTestId } = render(
      <LogFormShell
        canSubmit={true}
        onSave={onSave}
        saveButtonTestID="save-btn"
        notesTestID="notes-input"
      />
    );

    fireEvent.changeText(getByTestId('notes-input'), 'my note');

    await act(async () => {
      fireEvent.press(getByTestId('save-btn'));
    });

    // onSave is called once; the handler internally propagates notes to all rows
    expect(onSave).toHaveBeenCalledWith({ notes: 'my note', focusId: undefined });
    // All simulated rows received the note
    expect(calls).toEqual([{ notes: 'my note' }, { notes: 'my note' }]);
  });

  it('renders focus dropdown toggle', () => {
    const { getByTestId } = render(
      <LogFormShell canSubmit={true} onSave={jest.fn()} />
    );
    expect(getByTestId('focus-dropdown')).toBeTruthy();
  });

  it('passes focusId in extras when focus selected via FocusDropdown', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <LogFormShell canSubmit={true} onSave={onSave} saveButtonTestID="save-btn" />
    );
    // Pressing the mocked FocusDropdown calls onSelect(42)
    fireEvent.press(getByTestId('focus-dropdown'));

    await act(async () => {
      fireEvent.press(getByTestId('save-btn'));
    });

    expect(onSave).toHaveBeenCalledWith({ notes: undefined, focusId: 42 });
  });
});
