import React from 'react';
import { render } from '@testing-library/react-native';
import { SaveErrorMessage } from '@/components/SaveErrorMessage';

describe('SaveErrorMessage', () => {
  it('renders error text when visible', () => {
    const { getByTestId } = render(
      <SaveErrorMessage visible testID="test-save-error" />
    );
    expect(getByTestId('test-save-error')).toBeTruthy();
  });

  it('renders nothing when not visible', () => {
    const { queryByTestId } = render(
      <SaveErrorMessage visible={false} testID="test-save-error" />
    );
    expect(queryByTestId('test-save-error')).toBeNull();
  });

  it('displays the standard save error message', () => {
    const { getByTestId } = render(
      <SaveErrorMessage visible testID="test-save-error" />
    );
    expect(getByTestId('test-save-error').props.children).toBe("Couldn't save. Try again.");
  });
});
