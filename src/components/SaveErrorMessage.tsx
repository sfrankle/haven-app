import React from 'react';
import { Text } from 'react-native';
import { logScreenStyles } from '@/constants/sharedStyles';
import { messages } from '@/constants/messages';

interface SaveErrorMessageProps {
  visible: boolean;
  message?: string;
  testID?: string;
}

export function SaveErrorMessage({ visible, message, testID }: SaveErrorMessageProps) {
  if (!visible) return null;
  return (
    <Text style={logScreenStyles.saveErrorText} testID={testID}>
      {message ?? messages.saveError}
    </Text>
  );
}
