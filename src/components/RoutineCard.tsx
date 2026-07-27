import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Surface } from './Surface';
import { formatTimeBlocks } from '@/lib/utils/routine-dashboard';
import { colors, typeScale, spacing, lineHeight } from '@/constants/theme';
import type { Routine } from '@/lib/db/query-types';

interface RoutineCardProps {
  routine: Routine;
  /** Today's progress line, or null when there is nothing to report. */
  progressText: string | null;
  onPress: () => void;
  testID?: string;
}

/**
 * A due-now Routine on the Tend dashboard. Presentational only — no hooks, no
 * database. Completion reads as plain text: no ticks, no bars, no percentages.
 */
export function RoutineCard({ routine, progressText, onPress, testID }: RoutineCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Complete ${routine.name}`}
      testID={testID}
    >
      <Surface style={styles.card}>
        <Text style={styles.name}>{routine.name}</Text>
        <Text style={styles.meta}>{formatTimeBlocks(routine.timeBlocks)}</Text>
        {progressText !== null && <Text style={styles.meta}>{progressText}</Text>}
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.elementGap,
  },
  name: {
    fontFamily: typeScale.titleMedium.family,
    fontWeight: typeScale.titleMedium.weight,
    fontSize: typeScale.titleMedium.size,
    lineHeight: lineHeight(typeScale.titleMedium),
    color: colors.ink,
  },
  meta: {
    fontFamily: typeScale.labelMedium.family,
    fontSize: typeScale.labelMedium.size,
    lineHeight: lineHeight(typeScale.labelMedium),
    color: colors.chrome,
  },
});
