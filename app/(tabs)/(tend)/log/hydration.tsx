import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, NumericInput, Button, SaveConfirmation } from '@/components';
import { useEntryTypes } from '@/hooks';
import { saveEntry, getDailyHydrationTotal } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { nowLocalIso } from '@/lib/utils/timestamp';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import { logScreenStyles } from '@/constants/sharedStyles';
import type { Db } from '@/lib/db/queries';

export default function LogHydrationScreen() {
  const router = useRouter();
  const { entryTypes } = useEntryTypes();
  const [oz, setOz] = useState('16');
  const [notes, setNotes] = useState('');
  const [dailyTotal, setDailyTotal] = useState<number>(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saveError, setSaveError] = useState(false);

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

  async function handleSave() {
    if (!hydrationEntryType || oz.trim() === '') return;

    const parsed = parseFloat(oz);
    const timestamp = nowLocalIso();
    const localDate = timestamp.slice(0, 10);
    const db = await getDb() as unknown as Db;

    try {
      await saveEntry(db, {
        entryTypeId: hydrationEntryType.id,
        timestamp,
        numericValue: isNaN(parsed) ? undefined : parsed,
        notes: notes.trim() !== '' ? notes.trim() : undefined,
      });
      const total = await getDailyHydrationTotal(db, localDate);
      setDailyTotal(total);
      setShowConfirmation(true);
    } catch (err) {
      console.error('[LogHydrationScreen] failed to save entry:', err);
      setSaveError(true);
    }
  }

  function handleDismiss() {
    router.replace("/");
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

        <TextInput
          style={logScreenStyles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor={colors.chrome}
          multiline
          numberOfLines={3}
          testID="hydration-notes-input"
        />

        {saveError && (
          <Text style={logScreenStyles.saveErrorText} testID="hydration-save-error">
            Something went wrong. Your entry was not saved.
          </Text>
        )}

        {oz.trim() !== '' && (
          <View style={logScreenStyles.saveButton}>
            <Button
              label="Save"
              onPress={() => { setSaveError(false); void handleSave(); }}
              testID="hydration-save-button"
            />
          </View>
        )}
      </View>

      <SaveConfirmation
        visible={showConfirmation}
        onDismiss={handleDismiss}
        testID="hydration-save-confirmation"
      />
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
