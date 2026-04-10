import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Screen, NumericInput, LogFormShell } from '@/components';
import { useEntryTypes } from '@/hooks';
import { saveEntry } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { nowLocalIso } from '@/lib/utils/timestamp';
import { logScreenStyles } from '@/constants/sharedStyles';
import type { Db } from '@/lib/db/queries';

export default function LogSleepScreen() {
  const { entryTypes } = useEntryTypes();
  const [hours, setHours] = useState('');

  const sleepEntryType = entryTypes.find((t) => t.name === 'Sleep');

  async function handleSave(extras: { notes?: string }) {
    if (!sleepEntryType || hours.trim() === '') return;

    const parsed = parseFloat(hours);
    const db = await getDb() as unknown as Db;

    await saveEntry(db, {
      entryTypeId: sleepEntryType.id,
      timestamp: nowLocalIso(),
      numericValue: isNaN(parsed) ? undefined : parsed,
      notes: extras.notes,
    });
  }

  return (
    <Screen showBack>
      <View style={logScreenStyles.screenContent}>
        <Text style={logScreenStyles.prompt}>{sleepEntryType?.prompt ?? sleepEntryType?.name}</Text>

        <NumericInput
          value={hours}
          onChangeText={setHours}
          unit="hours"
          testID="sleep-hours-input"
        />

        <LogFormShell
          canSubmit={hours.trim() !== ''}
          onSave={handleSave}
          saveButtonTestID="sleep-save-button"
          notesTestID="sleep-notes-input"
          errorTestID="sleep-save-error"
          confirmationTestID="sleep-save-confirmation"
        />
      </View>
    </Screen>
  );
}
