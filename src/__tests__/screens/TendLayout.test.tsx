import React from 'react';
import { render } from '@testing-library/react-native';

// Declared before jest.mock so the factory closure can reference them.
const mockDispatch = jest.fn();
const mockAddListener = jest.fn();

jest.mock('expo-router', () => ({
  Stack: () => null,
  useNavigation: () => ({
    addListener: mockAddListener,
    dispatch: mockDispatch,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  StackActions: {
    popToTop: jest.fn().mockReturnValue({ type: 'POP_TO_TOP' }),
  },
}));

// Import after mocks are set up.
// eslint-disable-next-line import/first
import TendLayout from '../../../app/(tabs)/(tend)/_layout';
// eslint-disable-next-line import/first
import { StackActions } from '@react-navigation/native';

describe('TendLayout — blur listener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReturnValue(jest.fn()); // default: returns unsubscribe fn
  });

  it('registers a blur listener on mount', () => {
    render(<TendLayout />);
    expect(mockAddListener).toHaveBeenCalledWith('blur', expect.any(Function));
  });

  it('dispatches popToTop when the blur event fires', () => {
    let blurCallback: (() => void) | undefined;
    mockAddListener.mockImplementation((event: string, cb: () => void) => {
      if (event === 'blur') blurCallback = cb;
      return jest.fn();
    });

    render(<TendLayout />);
    expect(blurCallback).toBeDefined();
    blurCallback!();

    expect(mockDispatch).toHaveBeenCalledWith(StackActions.popToTop());
  });

  it('removes the blur listener on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockAddListener.mockReturnValue(mockUnsubscribe);

    const { unmount } = render(<TendLayout />);
    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
