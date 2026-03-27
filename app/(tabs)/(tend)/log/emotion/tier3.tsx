import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, SplitPane, SplitPaneRow, Chip, Button, SaveConfirmation } from '@/components';
import { useEntryTypes } from '@/hooks';
import { getLabelsByParent, saveEntry } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { nowLocalIso } from '@/lib/utils/timestamp';
import { colorForEmotionLabel } from '@/constants/chipColors';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import type { Db } from '@/lib/db/queries';
import type { Label } from '@/lib/db/query-types';

export default function LogEmotionScreen3() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tier1Id: string;
    tier2Id: string;
    chipLabelId?: string;
    chipLabelName?: string;
  }>();
  const { entryTypes } = useEntryTypes();

  const [tier2Labels, setTier2Labels] = useState<Label[]>([]);
  const [tier3Labels, setTier3Labels] = useState<Label[]>([]);
  const [activeTier2Id, setActiveTier2Id] = useState<number>(Number(params.tier2Id));
  // Chip state: initialise from URL params, allow local override
  const [chipLabel, setChipLabel] = useState<{ id: number; name: string } | null>(
    params.chipLabelId && params.chipLabelName
      ? { id: Number(params.chipLabelId), name: params.chipLabelName }
      : null
  );
  const [showConfirmation, setShowConfirmation] = useState(false);

  const emotionEntryType = entryTypes.find((t) => t.name === 'Emotion');

  // Load Tier-2 siblings (all Tier-2 children of the parent Tier-1)
  useEffect(() => {
    const tier1Id = Number(params.tier1Id);
    if (!tier1Id) return;
    void (async () => {
      const db = (await getDb()) as unknown as Db;
      const labels = await getLabelsByParent(db, tier1Id);
      setTier2Labels(labels);
    })();
  }, [params.tier1Id]);

  // Load Tier-3 children when active Tier-2 changes
  useEffect(() => {
    if (!activeTier2Id) return;
    void (async () => {
      const db = (await getDb()) as unknown as Db;
      const labels = await getLabelsByParent(db, activeTier2Id);
      setTier3Labels(labels);
    })();
  }, [activeTier2Id]);

  function handleTier2Press(label: Label) {
    setActiveTier2Id(label.id);
    // Do NOT change chip when switching Tier-2 left column
  }

  function handleTier3Press(label: Label) {
    // setChipLabel avoids a flicker between the router.replace call and the
    // resulting remount re-initialising chip state from the new params.
    setChipLabel({ id: label.id, name: label.name });
    router.replace({
      pathname: '/log/emotion/tier3',
      params: {
        tier1Id: params.tier1Id,
        tier2Id: activeTier2Id,
        chipLabelId: label.id,
        chipLabelName: label.name,
      },
    });
  }

  function handleChipRemove() {
    setChipLabel(null);
  }

  async function handleSave() {
    if (!emotionEntryType || !chipLabel) return;
    const db = (await getDb()) as unknown as Db;
    try {
      await saveEntry(db, {
        entryTypeId: emotionEntryType.id,
        timestamp: nowLocalIso(),
        labelIds: [chipLabel.id],
      });
      setShowConfirmation(true);
    } catch (err) {
      console.error('[LogEmotionScreen3] failed to save entry:', err);
    }
  }

  function handleDismiss() {
    router.replace('/');
  }

  return (
    <Screen showBack>
      <View style={styles.container} testID="emotion-screen-3">
        <SplitPane
          left={
            <>
              {tier2Labels.map((label) => (
                <SplitPaneRow
                  key={label.id}
                  label={label.name}
                  isActive={label.id === activeTier2Id}
                  onPress={() => handleTier2Press(label)}
                  testID={`emotion-tier2-left-${label.id}`}
                />
              ))}
            </>
          }
          right={
            <>
              {tier3Labels.length === 0 ? (
                <Text style={styles.emptyRight} testID="emotion-tier3-empty">
                  No further detail available.
                </Text>
              ) : (
                tier3Labels.map((label) => (
                  <SplitPaneRow
                    key={label.id}
                    label={label.name}
                    isActive={false}
                    onPress={() => handleTier3Press(label)}
                    testID={`emotion-tier3-right-${label.id}`}
                  />
                ))
              )}
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

        {chipLabel && (
          <View style={styles.saveButton}>
            <Button
              label="Save"
              onPress={() => { void handleSave(); }}
              testID="emotion-save-button"
            />
          </View>
        )}
      </View>

      <SaveConfirmation
        visible={showConfirmation}
        onDismiss={handleDismiss}
        testID="emotion-save-confirmation"
      />
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
  saveButton: {
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.elementGap,
  },
  emptyRight: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.chrome,
    paddingHorizontal: spacing.elementGap,
    paddingTop: spacing.elementGap,
  },
});
