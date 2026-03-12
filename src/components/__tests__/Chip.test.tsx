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

  it('renders severity suffix when showSeverity is true', () => {
    const { getByText } = render(
      <Chip {...baseProps} label="Cramps" showSeverity severity={2} />
    );
    expect(getByText('Cramps (2/5)')).toBeTruthy();
  });

  it('does not render severity suffix by default', () => {
    const { getByText } = render(
      <Chip {...baseProps} label="Cramps" />
    );
    expect(getByText('Cramps')).toBeTruthy();
    expect(() => getByText('Cramps (2/5)')).toThrow();
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
});
