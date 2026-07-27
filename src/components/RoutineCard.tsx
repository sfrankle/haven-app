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
  /**
   * "full" is a due-now card: name, configured blocks, progress.
   * "compact" is a row inside the disclosure: name and progress on one line.
   */
  variant?: 'full' | 'compact';
  testID?: string;
}

/**
 * A Routine on the Tend dashboard. Presentational only — no hooks, no
 * database. Completion reads as plain text: no ticks, no bars, no percentages.
 */
export function RoutineCard({
  routine,
  progressText,
  onPress,
  variant = 'full',
  testID,
}: RoutineCardProps) {
  const compact = variant === 'compact';
  const blocksText = formatTimeBlocks(routine.timeBlocks);

  // The Pressable collapses its subtree for screen readers, so the card's own
  // lines are never announced on their own — the label has to carry them.
  const label = [
    `Complete ${routine.name}`,
    compact ? null : blocksText,
    progressText,
  ]
    .filter((part) => part !== null)
    .join('. ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <Surface style={compact ? styles.compactCard : styles.card}>
        <Text style={compact ? styles.compactName : styles.name}>{routine.name}</Text>
        {!compact && <Text style={styles.meta}>{blocksText}</Text>}
        {progressText !== null && <Text style={styles.meta}>{progressText}</Text>}
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.elementGap,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.elementGap,
  },
  name: {
    fontFamily: typeScale.titleMedium.family,
    fontWeight: typeScale.titleMedium.weight,
    fontSize: typeScale.titleMedium.size,
    lineHeight: lineHeight(typeScale.titleMedium),
    color: colors.ink,
  },
  compactName: {
    fontFamily: typeScale.labelMedium.family,
    fontSize: typeScale.labelMedium.size,
    lineHeight: lineHeight(typeScale.labelMedium),
    color: colors.ink,
  },
  meta: {
    fontFamily: typeScale.labelMedium.family,
    fontSize: typeScale.labelMedium.size,
    lineHeight: lineHeight(typeScale.labelMedium),
    color: colors.chrome,
  },
});
