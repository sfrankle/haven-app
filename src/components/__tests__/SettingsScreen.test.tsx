import React from 'react';
import { render } from '@testing-library/react-native';
import SettingsScreen from '../../../app/(tabs)/settings';

describe('SettingsScreen', () => {
  it('renders the privacy notice text', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Your data is stored only on this device.')).toBeTruthy();
  });

  it('privacy notice has testID="privacy-notice"', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('privacy-notice')).toBeTruthy();
  });
});
