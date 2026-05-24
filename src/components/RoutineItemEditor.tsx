import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import { routineStyles } from '@/constants/sharedStyles';
import type { DraftRoutineItem } from '@/hooks/useRoutineForm';
import type { EntryType } from '@/lib/db/query-types';

interface Props {
  index: number;
  item: DraftRoutineItem;
  entryTypes: EntryType[];
  totalItems: number;
  testIDPrefix: string;
  onUpdate: (patch: Partial<DraftRoutineItem>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function RoutineItemEditor({
  index,
  item,
  entryTypes,
  totalItems,
  testIDPrefix,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  return (
    <View style={routineStyles.itemCard}>
      <TextInput
        style={styles.itemNameInput}
        value={item.name}
        onChangeText={(text) => onUpdate({ name: text })}
        placeholder="Item name"
        placeholderTextColor={colors.chrome}
        testID={`${testIDPrefix}-name-input`}
        returnKeyType="done"
      />

      <View style={routineStyles.entryTypeRow}>
        {entryTypes.map((et) => {
          const selected = item.entryTypeId === et.id;
          return (
            <Pressable
              key={et.id}
              style={[routineStyles.blockChip, selected && routineStyles.blockChipSelected]}
              onPress={() => onUpdate({ entryTypeId: selected ? null : et.id, labelIds: [] })}
              testID={`${testIDPrefix}-entry-type-${et.id}`}
              accessibilityState={{ selected }}
            >
              <Text style={[routineStyles.blockChipText, selected && routineStyles.blockChipTextSelected]}>
                {et.title}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={routineStyles.detailInput}
        value={item.prescribedDetail}
        onChangeText={(text) => onUpdate({ prescribedDetail: text })}
        placeholder="What to do or take (optional)"
        placeholderTextColor={colors.chrome}
        testID={`${testIDPrefix}-prescribed-detail`}
        returnKeyType="done"
      />

      <TextInput
        style={routineStyles.detailInput}
        value={item.instructionNote}
        onChangeText={(text) => onUpdate({ instructionNote: text })}
        placeholder="Instruction note (optional)"
        placeholderTextColor={colors.chrome}
        testID={`${testIDPrefix}-instruction-note`}
        returnKeyType="done"
      />

      <View style={styles.itemControls}>
        {index > 0 && (
          <Pressable
            style={styles.controlButton}
            onPress={onMoveUp}
            testID={`${testIDPrefix}-up-button`}
            accessibilityLabel="Move item up"
          >
            <Text style={styles.controlButtonText}>↑</Text>
          </Pressable>
        )}
        {index < totalItems - 1 && (
          <Pressable
            style={styles.controlButton}
            onPress={onMoveDown}
            testID={`${testIDPrefix}-down-button`}
            accessibilityLabel="Move item down"
          >
            <Text style={styles.controlButtonText}>↓</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.controlButton, styles.removeButton]}
          onPress={onRemove}
          testID={`${testIDPrefix}-remove-button`}
          accessibilityLabel="Remove item"
        >
          <Text style={styles.controlButtonText}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  itemNameInput: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.chrome,
    paddingVertical: 6,
    marginBottom: spacing.elementGap,
  },
  itemControls: {
    flexDirection: 'row',
    gap: spacing.elementGap,
    marginTop: 4,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.chrome,
  },
  removeButton: {
    marginLeft: 'auto',
    borderColor: colors.chrome,
  },
  controlButtonText: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.ink,
  },
});
