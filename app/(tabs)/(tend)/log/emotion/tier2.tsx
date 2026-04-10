import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, SplitPane, SplitPaneRow, Chip, LogFormShell } from '@/components';
import { useEntryTypes } from '@/hooks';
import { getTier1EmotionLabels, getLabelsByParent, saveEntry } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { nowLocalIso } from '@/lib/utils/timestamp';
import { colorForEmotionLabel } from '@/constants/chipColors';
import { spacing } from '@/constants/theme';
import { logScreenStyles } from '@/constants/sharedStyles';
import type { Db } from '@/lib/db/queries';
import type { Label } from '@/lib/db/query-types';

export default function LogEmotionScreen2() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tier1Id: string;
    chipLabelId?: string;
    chipLabelName?: string;
  }>();
  const { entryTypes } = useEntryTypes();

  const [tier1Labels, setTier1Labels] = useState<Label[]>([]);
  const [tier2Labels, setTier2Labels] = useState<Label[]>([]);
  const [activeTier1Id, setActiveTier1Id] = useState<number>(Number(params.tier1Id));
  // Chip state: initialise from URL params, allow local clearing
  const [chipLabel, setChipLabel] = useState<{ id: number; name: string } | null>(
    params.chipLabelId && params.chipLabelName
      ? { id: Number(params.chipLabelId), name: params.chipLabelName }
      : null
  );

  const emotionEntryType = entryTypes.find((t) => t.name === 'Emotion');

  // Load Tier-1 labels once
  useEffect(() => {
    if (!emotionEntryType) return;
    void (async () => {
      const db = (await getDb()) as unknown as Db;
      const labels = await getTier1EmotionLabels(db, emotionEntryType.id);
      setTier1Labels(labels);
    })();
  }, [emotionEntryType]);

  // Load Tier-2 labels when active Tier-1 changes
  useEffect(() => {
    if (!activeTier1Id) return;
    void (async () => {
      const db = (await getDb()) as unknown as Db;
      const labels = await getLabelsByParent(db, activeTier1Id);
      setTier2Labels(labels);
    })();
  }, [activeTier1Id]);

  function handleTier1Press(label: Label) {
    setActiveTier1Id(label.id);
    // Do NOT clear the chip when switching Tier-1 in the left column
  }

  function handleTier2Press(label: Label) {
    // Set chip locally so Screen 2 shows it if the user presses back from Screen 3
    setChipLabel({ id: label.id, name: label.name });
    router.push({
      pathname: '/log/emotion/tier3',
      params: {
        tier1Id: activeTier1Id,
        tier2Id: label.id,
        chipLabelId: label.id,
        chipLabelName: label.name,
      },
    });
  }

  function handleChipRemove() {
    setChipLabel(null);
  }

  async function handleSave(extras: { notes?: string }) {
    if (!emotionEntryType || !chipLabel) return;
    const db = (await getDb()) as unknown as Db;
    await saveEntry(db, {
      entryTypeId: emotionEntryType.id,
      timestamp: nowLocalIso(),
      labelIds: [chipLabel.id],
      notes: extras.notes,
    });
  }

  return (
    <Screen showBack>
      <View style={styles.container} testID="emotion-screen-2">
        <Text style={[logScreenStyles.prompt, logScreenStyles.promptPadded]}>
          {emotionEntryType?.prompt ?? emotionEntryType?.name}
        </Text>
        <SplitPane
          left={
            <>
              {tier1Labels.map((label) => (
                <SplitPaneRow
                  key={label.id}
                  label={label.name}
                  isActive={label.id === activeTier1Id}
                  onPress={() => handleTier1Press(label)}
                  testID={`emotion-tier1-left-${label.id}`}
                />
              ))}
            </>
          }
          right={
            <>
              {tier2Labels.map((label) => (
                <SplitPaneRow
                  key={label.id}
                  label={label.name}
                  isActive={false}
                  onPress={() => handleTier2Press(label)}
                  testID={`emotion-tier2-right-${label.id}`}
                />
              ))}
            </>
          }
        />

        {chipLabel && (
          <View style={styles.chipTray}>
            <Chip
              label={chipLabel.name}
              color={colorForEmotionLabel({ categoryName: null })}
              onRemove={handleChipRemove}
              testID="emotion-chip"
            />
          </View>
        )}

        <LogFormShell
          canSubmit={!!chipLabel}
          onSave={handleSave}
          saveButtonTestID="emotion-save-button"
          notesTestID="emotion-notes-input"
          errorTestID="emotion-save-error"
          confirmationTestID="emotion-save-confirmation"
        >
          {null}
        </LogFormShell>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.sectionGap,
  },
  chipTray: {
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.elementGap,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
