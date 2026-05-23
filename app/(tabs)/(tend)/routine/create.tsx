import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components';
import { Button } from '@/components/Button';
import { FocusDropdown } from '@/components/FocusDropdown';
import { createRoutine, createRoutineItems, getEntryTypes } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { getScheduleableBlocks } from '@/lib/utils/timestamp';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import { logScreenStyles } from '@/constants/sharedStyles';
import type { Db } from '@/lib/db/queries';
import type { EntryType, RoutineItemInput, ScheduleableBlock } from '@/lib/db/query-types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DraftRoutineItem {
  /** Local-only React key */
  key: string;
  name: string;
  entryTypeId: number | null;
  labelIds: number[];
  prescribedDetail: string;
  instructionNote: string;
}

const SCHEDULEABLE_BLOCKS = getScheduleableBlocks();

function makeDraftItem(): DraftRoutineItem {
  return {
    key: Date.now().toString() + Math.random().toString(36).slice(2),
    name: '',
    entryTypeId: null,
    labelIds: [],
    prescribedDetail: '',
    instructionNote: '',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateRoutineScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedBlocks, setSelectedBlocks] = useState<Set<ScheduleableBlock>>(new Set());
  const [associatedFocusId, setAssociatedFocusId] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<DraftRoutineItem[]>([]);
  const [entryTypes, setEntryTypes] = useState<EntryType[]>([]);
  const [frequencyNote, setFrequencyNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load entry types once
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const db = (await getDb()) as unknown as Db;
        const types = await getEntryTypes(db);
        if (isMounted) setEntryTypes(types);
      } catch {
        // non-fatal — entry type chips just won't appear
      }
    }
    void load();
    return () => { isMounted = false; };
  }, []);

  function toggleBlock(block: ScheduleableBlock) {
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(block)) {
        next.delete(block);
      } else {
        next.add(block);
      }
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, makeDraftItem()]);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    setItems((prev) => {
      const next = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }

  const updateItem = useCallback(
    (key: string, patch: Partial<DraftRoutineItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
      );
    },
    []
  );

  const trimmedName = name.trim();
  const allItemsValid = items.every(
    (item) => item.name.trim().length > 0 && item.entryTypeId !== null
  );
  const canSave = trimmedName.length > 0 && allItemsValid;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const db = (await getDb()) as unknown as Db;
      const routine = await createRoutine(db, {
        name: trimmedName,
        timeBlocks: Array.from(selectedBlocks),
        associatedFocusId,
        frequencyNote: frequencyNote.trim() || undefined,
      });

      const itemInputs: RoutineItemInput[] = items.map((item) => ({
        name: item.name.trim(),
        entryTypeId: item.entryTypeId!,
        labelIds: item.labelIds.length ? item.labelIds : undefined,
        prescribedDetail: item.prescribedDetail.trim() || null,
        instructionNote: item.instructionNote.trim() || null,
      }));
      await createRoutineItems(db, routine.id, itemInputs);

      setSaving(false);
      router.back();
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  return (
    <Screen showBack>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={logScreenStyles.screenContent}>
          {/* Routine name */}
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Routine name"
            placeholderTextColor={colors.chrome}
            autoFocus
            testID="routine-name-input"
            returnKeyType="done"
          />

          {/* Optional Focus association */}
          <FocusDropdown
            selectedId={associatedFocusId}
            onSelect={(id) => setAssociatedFocusId(id)}
            testID="routine-focus-dropdown"
          />

          {/* Frequency note */}
          <TextInput
            style={styles.detailInput}
            value={frequencyNote}
            onChangeText={setFrequencyNote}
            placeholder="Frequency note (optional)"
            placeholderTextColor={colors.chrome}
            testID="routine-frequency-note"
            returnKeyType="done"
          />

          {/* Time block multi-select */}
          <Text style={styles.sectionLabel}>When</Text>
          <View style={styles.timeBlockRow}>
            {SCHEDULEABLE_BLOCKS.map((block) => {
              const selected = selectedBlocks.has(block);
              return (
                <Pressable
                  key={block}
                  style={[styles.blockChip, selected && styles.blockChipSelected]}
                  onPress={() => toggleBlock(block)}
                  testID={`routine-time-block-${block}`}
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[styles.blockChipText, selected && styles.blockChipTextSelected]}
                  >
                    {block}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Items list */}
          {items.map((item, index) => (
            <RoutineItemEditor
              key={item.key}
              index={index}
              item={item}
              entryTypes={entryTypes}
              totalItems={items.length}
              onUpdate={(patch) => updateItem(item.key, patch)}
              onRemove={() => removeItem(item.key)}
              onMoveUp={() => moveItem(index, 'up')}
              onMoveDown={() => moveItem(index, 'down')}
            />
          ))}

          {/* Add Item button */}
          <Pressable
            style={styles.addItemButton}
            onPress={addItem}
            testID="routine-add-item-button"
          >
            <Text style={styles.addItemText}>+ Add Item</Text>
          </Pressable>

          {/* Error */}
          {error !== null && (
            <Text style={logScreenStyles.saveErrorText} testID="routine-save-error">
              {error}
            </Text>
          )}

          {/* Save (disappears when invalid) */}
          {canSave && (
            <View style={logScreenStyles.saveButton}>
              <Button
                label="Save"
                onPress={() => { void handleSave(); }}
                disabled={saving}
                testID="routine-save-button"
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ─── RoutineItemEditor ────────────────────────────────────────────────────────

interface RoutineItemEditorProps {
  index: number;
  item: DraftRoutineItem;
  entryTypes: EntryType[];
  totalItems: number;
  onUpdate: (patch: Partial<DraftRoutineItem>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function RoutineItemEditor({
  index,
  item,
  entryTypes,
  totalItems,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: RoutineItemEditorProps) {
  const prefix = `routine-item-${index}`;

  return (
    <View style={styles.itemCard}>
      {/* Item name */}
      <TextInput
        style={styles.itemNameInput}
        value={item.name}
        onChangeText={(text) => onUpdate({ name: text })}
        placeholder="Item name"
        placeholderTextColor={colors.chrome}
        testID={`${prefix}-name-input`}
        returnKeyType="done"
      />

      {/* Entry type chips */}
      <View style={styles.entryTypeRow}>
        {entryTypes.map((et) => {
          const selected = item.entryTypeId === et.id;
          return (
            <Pressable
              key={et.id}
              style={[styles.blockChip, selected && styles.blockChipSelected]}
              onPress={() => onUpdate({ entryTypeId: selected ? null : et.id, labelIds: [] })}
              testID={`${prefix}-entry-type-${et.id}`}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.blockChipText, selected && styles.blockChipTextSelected]}>
                {et.title}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Prescribed detail */}
      <TextInput
        style={styles.detailInput}
        value={item.prescribedDetail}
        onChangeText={(text) => onUpdate({ prescribedDetail: text })}
        placeholder="Prescribed detail (optional)"
        placeholderTextColor={colors.chrome}
        testID={`${prefix}-prescribed-detail`}
        returnKeyType="done"
      />

      {/* Instruction note */}
      <TextInput
        style={styles.detailInput}
        value={item.instructionNote}
        onChangeText={(text) => onUpdate({ instructionNote: text })}
        placeholder="Instruction note (optional)"
        placeholderTextColor={colors.chrome}
        testID={`${prefix}-instruction-note`}
        returnKeyType="done"
      />

      {/* Controls */}
      <View style={styles.itemControls}>
        {index > 0 && (
          <Pressable
            style={styles.controlButton}
            onPress={onMoveUp}
            testID={`${prefix}-up-button`}
            accessibilityLabel="Move item up"
          >
            <Text style={styles.controlButtonText}>↑</Text>
          </Pressable>
        )}
        {index < totalItems - 1 && (
          <Pressable
            style={styles.controlButton}
            onPress={onMoveDown}
            testID={`${prefix}-down-button`}
            accessibilityLabel="Move item down"
          >
            <Text style={styles.controlButtonText}>↓</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.controlButton, styles.removeButton]}
          onPress={onRemove}
          testID={`${prefix}-remove-button`}
          accessibilityLabel="Remove item"
        >
          <Text style={styles.controlButtonText}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  nameInput: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.chrome,
    paddingVertical: spacing.elementGap,
    marginBottom: spacing.sectionGap,
  },
  sectionLabel: {
    fontFamily: typeScale.labelMedium.family,
    fontWeight: typeScale.labelMedium.weight,
    fontSize: typeScale.labelMedium.size,
    lineHeight: lineHeight(typeScale.labelMedium),
    color: colors.chrome,
    marginTop: spacing.sectionGap,
    marginBottom: spacing.elementGap,
  },
  timeBlockRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.elementGap,
    marginBottom: spacing.sectionGap,
  },
  blockChip: {
    paddingHorizontal: spacing.elementGap,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.chrome,
    backgroundColor: colors.surface,
  },
  blockChipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  blockChipText: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.ink,
  },
  blockChipTextSelected: {
    color: colors.surface,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.chrome,
    borderRadius: 8,
    padding: spacing.elementGap,
    marginBottom: spacing.elementGap,
    backgroundColor: colors.surface,
  },
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
  entryTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.elementGap,
    marginBottom: spacing.elementGap,
  },
  detailInput: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.chrome,
    paddingVertical: 4,
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
  addItemButton: {
    paddingVertical: spacing.elementGap,
    alignItems: 'center',
    marginBottom: spacing.sectionGap,
  },
  addItemText: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
  },
});
