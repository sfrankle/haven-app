import React from 'react';
import { render, act } from '@testing-library/react-native';
import { SaveConfirmation } from '../SaveConfirmation';

describe('SaveConfirmation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not render content when visible is false', () => {
    const { queryByText } = render(
      <SaveConfirmation visible={false} />
    );
    expect(queryByText('Entry saved.')).toBeNull();
  });

  it('renders the default message "Entry saved." when visible is true', () => {
    const { getByText } = render(
      <SaveConfirmation visible={true} />
    );
    expect(getByText('Entry saved.')).toBeTruthy();
  });

  it('renders a custom message when provided', () => {
    const { getByText } = render(
      <SaveConfirmation visible={true} message="Sleep logged." />
    );
    expect(getByText('Sleep logged.')).toBeTruthy();
  });

  it('calls onDismiss after the animation completes', () => {
    const onDismiss = jest.fn();
    render(
      <SaveConfirmation visible={true} duration={1500} onDismiss={onDismiss} />
    );
    // fade-in: 150ms + duration: 1500ms + fade-out: 200ms = 1850ms total
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
