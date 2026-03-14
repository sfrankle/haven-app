import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, NumericInput, Button, SaveConfirmation } from '@/components';
import { useEntryTypes } from '@/hooks';
import { saveEntry, getDailyHydrationTotal } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { nowLocalIso } from '@/lib/utils/timestamp';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import type { Db } from '@/lib/db/queries';

export default function LogHydrationScreen() {
  const router = useRouter();
  const { entryTypes } = useEntryTypes();
  const [oz, setOz] = useState('16');
  const [notes, setNotes] = useState('');
  const [dailyTotal, setDailyTotal] = useState<number>(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

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
    }
  }

  function handleDismiss() {
    router.replace("/");
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.prompt}>
          {hydrationEntryType?.prompt ?? 'How much water have you had?'}
        </Text>

        <Text style={styles.dailyTotal}>{`Today: ${dailyTotal} oz`}</Text>

        <NumericInput
          value={oz}
          onChangeText={setOz}
          unit="oz"
          testID="hydration-oz-input"
        />

        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor={colors.chrome}
          multiline
          numberOfLines={3}
          testID="hydration-notes-input"
        />

        {oz.trim() !== '' && (
          <View style={styles.saveButton}>
            <Button
              label="Save"
              onPress={handleSave}
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
  container: {
    flex: 1,
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.sectionGap,
  },
  prompt: {
    fontFamily: typeScale.titleLarge.family,
    fontWeight: typeScale.titleLarge.weight,
    fontSize: typeScale.titleLarge.size,
    lineHeight: lineHeight(typeScale.titleLarge),
    color: colors.ink,
    marginBottom: spacing.sectionGap,
  },
  dailyTotal: {
    fontFamily: typeScale.bodyLarge.family,
    fontWeight: typeScale.bodyLarge.weight,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.chrome,
    marginBottom: spacing.elementGap,
  },
  notesInput: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.chrome,
    paddingVertical: spacing.elementGap,
    marginTop: spacing.sectionGap,
    marginBottom: spacing.sectionGap,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: spacing.elementGap,
  },
});
