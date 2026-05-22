import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from './Button';
import { SaveConfirmation } from './SaveConfirmation';
import { SaveErrorMessage } from './SaveErrorMessage';
import { FocusDropdown } from './FocusDropdown';
import { colors } from '@/constants/theme';
import { logScreenStyles } from '@/constants/sharedStyles';

interface LogFormShellProps {
  canSubmit: boolean;
  onSave: (extras: { notes?: string; focusId?: number }) => Promise<void>;
  initialFocusId?: number;
  confirmationTestID?: string;
  errorTestID?: string;
  saveButtonTestID?: string;
  notesTestID?: string;
  /** Optional style forwarded to the FocusDropdown root View. Use to add
   *  horizontal padding on screens that don't provide their own. */
  focusDropdownStyle?: ViewStyle;
}

export function LogFormShell({
  canSubmit,
  onSave,
  initialFocusId,
  confirmationTestID,
  errorTestID,
  saveButtonTestID,
  notesTestID,
  focusDropdownStyle,
}: LogFormShellProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notes, setNotes] = useState('');
  const [focusId, setFocusId] = useState<number | undefined>(initialFocusId);

  async function handlePress() {
    if (saving) return;
    setSaveError(false);
    setSaving(true);
    try {
      const trimmed = notes.trim();
      const notesValue = trimmed !== '' ? trimmed : undefined;
      await onSave({ notes: notesValue, focusId });
      setShowConfirmation(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  function handleDismiss() {
    router.replace('/');
  }

  return (
    <>
      <FocusDropdown
        selectedId={focusId}
        onSelect={setFocusId}
        defaultExpanded={initialFocusId !== undefined}
        testID="focus-dropdown"
        style={focusDropdownStyle}
      />

      <TextInput
        style={logScreenStyles.notesInput}
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.chrome}
        multiline
        numberOfLines={3}
        testID={notesTestID}
      />

      <SaveErrorMessage visible={saveError} testID={errorTestID} />

      {canSubmit && (
        <View style={logScreenStyles.saveButton}>
          <Button
            label="Save"
            onPress={() => { void handlePress(); }}
            disabled={saving}
            testID={saveButtonTestID}
          />
        </View>
      )}

      <SaveConfirmation
        visible={showConfirmation}
        onDismiss={handleDismiss}
        testID={confirmationTestID}
      />
    </>
  );
}
