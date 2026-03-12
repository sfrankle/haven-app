import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchBar } from '../SearchBar';

describe('SearchBar', () => {
  it('renders with the given value', () => {
    const { getByDisplayValue } = render(
      <SearchBar value="oats" onChangeText={jest.fn()} />
    );
    expect(getByDisplayValue('oats')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByDisplayValue } = render(
      <SearchBar value="oats" onChangeText={onChangeText} />
    );
    fireEvent.changeText(getByDisplayValue('oats'), 'oatmeal');
    expect(onChangeText).toHaveBeenCalledWith('oatmeal');
  });

  it('clear button is not visible when value is empty', () => {
    const { queryByLabelText } = render(
      <SearchBar value="" onChangeText={jest.fn()} />
    );
    expect(queryByLabelText('Clear search')).toBeNull();
  });

  it('clear button is visible when value is non-empty', () => {
    const { getByLabelText } = render(
      <SearchBar value="oats" onChangeText={jest.fn()} />
    );
    expect(getByLabelText('Clear search')).toBeTruthy();
  });

  it('pressing the clear button calls onChangeText with an empty string', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <SearchBar value="oats" onChangeText={onChangeText} />
    );
    fireEvent.press(getByLabelText('Clear search'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });
});
