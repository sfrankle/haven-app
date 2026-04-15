import React from 'react';
import { render } from '@testing-library/react-native';
import { SaveErrorMessage } from '@/components/SaveErrorMessage';
import { messages } from '@/constants/messages';

describe('SaveErrorMessage', () => {
  it('renders nothing when not visible', () => {
    const { queryByText } = render(
      <SaveErrorMessage visible={false} />
    );
    expect(queryByText(messages.saveError)).toBeNull();
  });

  it('renders default saveError message when visible and no message prop', () => {
    const { getByText } = render(
      <SaveErrorMessage visible />
    );
    expect(getByText(messages.saveError)).toBeTruthy();
  });

  it('renders custom message when message prop is provided', () => {
    const { getByText } = render(
      <SaveErrorMessage visible message="A focus with that name already exists." />
    );
    expect(getByText('A focus with that name already exists.')).toBeTruthy();
  });

  it('forwards testID', () => {
    const { getByTestId } = render(
      <SaveErrorMessage visible testID="my-error" />
    );
    expect(getByTestId('my-error')).toBeTruthy();
  });
});
