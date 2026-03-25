import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, SplitPaneRow } from '@/components';
import { useEntryTypes } from '@/hooks';
import { getTier1EmotionLabels } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import type { Db } from '@/lib/db/queries';
import type { Label } from '@/lib/db/query-types';

export default function LogEmotionScreen1() {
  const router = useRouter();
  const { entryTypes } = useEntryTypes();
  const [tier1Labels, setTier1Labels] = useState<Label[]>([]);

  const emotionEntryType = entryTypes.find((t) => t.name === 'Emotion');

  useEffect(() => {
    if (!emotionEntryType) return;
    void (async () => {
      const db = (await getDb()) as unknown as Db;
      const labels = await getTier1EmotionLabels(db, emotionEntryType.id);
      setTier1Labels(labels);
    })();
  }, [emotionEntryType]);

  function handleTier1Press(label: Label) {
    router.push({
      pathname: '/log/emotion/tier2',
      params: { tier1Id: label.id },
    });
  }

  return (
    <Screen>
      <View style={styles.container} testID="emotion-screen-1">
        <Text style={styles.prompt}>
          {emotionEntryType?.prompt ?? 'What are you feeling?'}
        </Text>
        <View style={styles.list}>
          {tier1Labels.map((label) => (
            <SplitPaneRow
              key={label.id}
              label={label.name}
              isActive={false}
              onPress={() => handleTier1Press(label)}
              testID={`emotion-tier1-${label.id}`}
            />
          ))}
        </View>
      </View>
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
  list: {
    flex: 1,
  },
});
