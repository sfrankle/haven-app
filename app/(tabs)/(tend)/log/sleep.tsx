import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, NumericInput, Button, SaveConfirmation } from '@/components';
import { useEntryTypes } from '@/hooks';
import { saveEntry } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { nowLocalIso } from '@/lib/utils/timestamp';
import { colors } from '@/constants/theme';
import { logScreenStyles } from '@/constants/sharedStyles';
import type { Db } from '@/lib/db/queries';

export default function LogSleepScreen() {
  const router = useRouter();
  const { entryTypes } = useEntryTypes();
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const sleepEntryType = entryTypes.find((t) => t.name === 'Sleep');

  async function handleSave() {
    if (!sleepEntryType || hours.trim() === '') return;

    const parsed = parseFloat(hours);
    const db = await getDb() as unknown as Db;

    try {
      await saveEntry(db, {
        entryTypeId: sleepEntryType.id,
        timestamp: nowLocalIso(),
        numericValue: isNaN(parsed) ? undefined : parsed,
        notes: notes.trim() !== '' ? notes.trim() : undefined,
      });
      setShowConfirmation(true);
    } catch (err) {
      console.error('[LogSleepScreen] failed to save entry:', err);
    }
  }

  function handleDismiss() {
    router.replace("/");
  }

  return (
    <Screen showBack>
      <View style={logScreenStyles.screenContent}>
        <Text style={logScreenStyles.prompt}>{sleepEntryType?.prompt ?? 'How long did you rest?'}</Text>

        <NumericInput
          value={hours}
          onChangeText={setHours}
          unit="hours"
          testID="sleep-hours-input"
        />

        <TextInput
          style={logScreenStyles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor={colors.chrome}
          multiline
          numberOfLines={3}
          testID="sleep-notes-input"
        />

        {hours.trim() !== '' && (
          <View style={logScreenStyles.saveButton}>
            <Button
              label="Save"
              onPress={handleSave}
              testID="sleep-save-button"
            />
          </View>
        )}
      </View>

      <SaveConfirmation
        visible={showConfirmation}
        onDismiss={handleDismiss}
        testID="sleep-save-confirmation"
      />
    </Screen>
  );
}

