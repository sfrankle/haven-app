import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NumericInput } from '../NumericInput';

describe('NumericInput', () => {
  it('renders the unit label', () => {
    const { getByText } = render(
      <NumericInput value="8" onChangeText={jest.fn()} unit="oz" />
    );
    expect(getByText('oz')).toBeTruthy();
  });

  it('renders the current value', () => {
    const { getByDisplayValue } = render(
      <NumericInput value="64" onChangeText={jest.fn()} unit="oz" />
    );
    expect(getByDisplayValue('64')).toBeTruthy();
  });

  it('calls onChangeText on text change', () => {
    const onChangeText = jest.fn();
    const { getByDisplayValue } = render(
      <NumericInput value="64" onChangeText={onChangeText} unit="oz" />
    );
    fireEvent.changeText(getByDisplayValue('64'), '72');
    expect(onChangeText).toHaveBeenCalledWith('72');
  });

  it('keyboardType is "numeric"', () => {
    const { getByDisplayValue } = render(
      <NumericInput value="64" onChangeText={jest.fn()} unit="oz" />
    );
    const input = getByDisplayValue('64');
    expect(input.props.keyboardType).toBe('numeric');
  });
});
