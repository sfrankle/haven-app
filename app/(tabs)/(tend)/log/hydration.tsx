import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, NumericInput, LogFormShell } from '@/components';
import { useEntryTypes } from '@/hooks';
import { saveEntry, getDailyHydrationTotal } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { nowLocalIso } from '@/lib/utils/timestamp';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import { logScreenStyles } from '@/constants/sharedStyles';
import type { Db } from '@/lib/db/queries';

export default function LogHydrationScreen() {
  const { entryTypes } = useEntryTypes();
  const [oz, setOz] = useState('16');
  const [dailyTotal, setDailyTotal] = useState<number>(0);

  const hydrationEntryType = entryTypes.find((t) => t.name === 'Hydration');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const localDate = nowLocalIso().slice(0, 10);
      const db = await getDb() as unknown as Db;
      const total = await getDailyHydrationTotal(db, localDate);
      if (!cancelled) setDailyTotal(total);
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleSave(extras: { notes?: string; focusId?: number }) {
    if (!hydrationEntryType || oz.trim() === '') return;

    const parsed = parseFloat(oz);
    const timestamp = nowLocalIso();
    const localDate = timestamp.slice(0, 10);
    const db = await getDb() as unknown as Db;

    await saveEntry(db, {
      entryTypeId: hydrationEntryType.id,
      timestamp,
      numericValue: isNaN(parsed) ? undefined : parsed,
      notes: extras.notes,
      focusId: extras.focusId,
    });
    const total = await getDailyHydrationTotal(db, localDate);
    setDailyTotal(total);
  }

  return (
    <Screen showBack>
      <View style={logScreenStyles.screenContent}>
        <Text style={logScreenStyles.prompt}>
          {hydrationEntryType?.prompt ?? hydrationEntryType?.name}
        </Text>

        <Text style={styles.dailyTotal}>{`Today: ${dailyTotal} oz`}</Text>

        <NumericInput
          value={oz}
          onChangeText={setOz}
          unit="oz"
          testID="hydration-oz-input"
        />

        <LogFormShell
          canSubmit={oz.trim() !== ''}
          onSave={handleSave}
          saveButtonTestID="hydration-save-button"
          notesTestID="hydration-notes-input"
          errorTestID="hydration-save-error"
          confirmationTestID="hydration-save-confirmation"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dailyTotal: {
    fontFamily: typeScale.bodyLarge.family,
    fontWeight: typeScale.bodyLarge.weight,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.chrome,
    marginBottom: spacing.elementGap,
  },
});
