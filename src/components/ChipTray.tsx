import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from './Chip';
import { spacing } from '@/constants/theme';

export interface ChipTrayItem {
  id: number | 'energy';
  label: string;
  color: string;
  onOpenSeverity?: () => void;
}

interface ChipTrayProps {
  chips: ChipTrayItem[];
  onRemove: (id: number | 'energy') => void;
  testID?: string;
}

export function ChipTray({ chips, onRemove, testID }: ChipTrayProps) {
  if (chips.length === 0) return null;

  return (
    <View style={styles.tray} testID={testID}>
      {chips.map((chip) => (
        <Chip
          key={String(chip.id)}
          label={chip.label}
          color={chip.color}
          onRemove={() => onRemove(chip.id)}
          onOpenSeverity={chip.onOpenSeverity}
          testID={testID ? `${testID}-chip-${chip.id}` : `chip-${chip.id}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.elementGap,
    marginTop: spacing.sectionGap,
  },
});
