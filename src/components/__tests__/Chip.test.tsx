import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Chip } from '../Chip';

describe('Chip', () => {
  const baseProps = {
    label: 'Cheese',
    onRemove: jest.fn(),
    color: '#F3D5E6',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the label text', () => {
    const { getByText } = render(<Chip {...baseProps} />);
    expect(getByText('Cheese')).toBeTruthy();
  });

  it('renders label with severity suffix when baked into label string', () => {
    const { getByText } = render(
      <Chip {...baseProps} label="Cramps (2/5)" />
    );
    expect(getByText('Cramps (2/5)')).toBeTruthy();
  });

  it('renders plain label when no severity suffix', () => {
    const { getByText } = render(
      <Chip {...baseProps} label="Cramps" />
    );
    expect(getByText('Cramps')).toBeTruthy();
  });

  it('calls onRemove when the chip is pressed', () => {
    const onRemove = jest.fn();
    const { getByRole } = render(<Chip {...baseProps} onRemove={onRemove} />);
    fireEvent.press(getByRole('button'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('has accessible role "button"', () => {
    const { getByRole } = render(<Chip {...baseProps} />);
    expect(getByRole('button')).toBeTruthy();
  });

  describe('onOpenSeverity prop', () => {
    it('renders "···" icon when onOpenSeverity is provided', () => {
      const { getByText } = render(
        <Chip {...baseProps} onOpenSeverity={jest.fn()} />
      );
      expect(getByText('···')).toBeTruthy();
    });

    it('does not render "···" icon when onOpenSeverity is not provided', () => {
      const { queryByText } = render(<Chip {...baseProps} />);
      expect(queryByText('···')).toBeNull();
    });

    it('tapping "···" icon calls onOpenSeverity, not onRemove', () => {
      const onRemove = jest.fn();
      const onOpenSeverity = jest.fn();
      const { getByTestId } = render(
        <Chip
          {...baseProps}
          onRemove={onRemove}
          onOpenSeverity={onOpenSeverity}
          testID="chip-with-severity"
        />
      );
      fireEvent.press(getByTestId('chip-with-severity-severity-icon'));
      expect(onOpenSeverity).toHaveBeenCalledTimes(1);
      expect(onRemove).not.toHaveBeenCalled();
    });

    it('tapping chip body still calls onRemove when onOpenSeverity is provided', () => {
      const onRemove = jest.fn();
      const onOpenSeverity = jest.fn();
      const { getByTestId } = render(
        <Chip
          {...baseProps}
          onRemove={onRemove}
          onOpenSeverity={onOpenSeverity}
          testID="chip-with-severity"
        />
      );
      fireEvent.press(getByTestId('chip-with-severity'));
      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });
});
