import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components';
import { Button } from '@/components/Button';
import { FocusDropdown } from '@/components/FocusDropdown';
import { RoutineItemEditor } from '@/components/RoutineItemEditor';
import {
  getRoutines,
  getRoutineItems,
  updateRoutine,
  replaceRoutineItems,
  setRoutineArchived,
  getEntryTypes,
} from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { getScheduleableBlocks } from '@/lib/utils/timestamp';
import { colors, spacing } from '@/constants/theme';
import { logScreenStyles, routineStyles } from '@/constants/sharedStyles';
import { useRoutineForm, draftFromRoutineItem, toRoutineItemInputs } from '@/hooks/useRoutineForm';
import type { Db } from '@/lib/db/queries';
import type { EntryType } from '@/lib/db/query-types';

const SCHEDULEABLE_BLOCKS = getScheduleableBlocks();

export default function EditRoutineScreen() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const routineId = Number(idParam);

  const form = useRoutineForm();
  const { setName, setSelectedBlocks, setFrequencyNote, setAssociatedFocusId, setItems } = form;
  const [entryTypes, setEntryTypes] = useState<EntryType[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const db = (await getDb()) as unknown as Db;
        const [routines, routineItems, types] = await Promise.all([
          getRoutines(db, { includeArchived: true }),
          getRoutineItems(db, routineId),
          getEntryTypes(db),
        ]);
        if (!isMounted) return;

        const routine = routines.find((r) => r.id === routineId);
        if (routine) {
          setName(routine.name);
          setSelectedBlocks(new Set(routine.timeBlocks));
          setFrequencyNote(routine.frequencyNote ?? '');
          if (routine.associatedFocusId != null) {
            setAssociatedFocusId(routine.associatedFocusId);
          }
          setItems(routineItems.map(draftFromRoutineItem));
          setEntryTypes(types);
        } else {
          setLoadError("Couldn't load routine. Go back and try again.");
        }
      } catch {
        if (isMounted) setLoadError("Couldn't load routine. Go back and try again.");
      }
    }
    void load();
    return () => { isMounted = false; };
  }, [routineId, setName, setSelectedBlocks, setFrequencyNote, setAssociatedFocusId, setItems]);

  async function handleSave() {
    if (!form.canSave) return;
    setSaving(true);
    setError(null);
    try {
      const db = (await getDb()) as unknown as Db;
      await updateRoutine(db, routineId, {
        name: form.name.trim(),
        timeBlocks: Array.from(form.selectedBlocks),
        associatedFocusId: form.associatedFocusId ?? null,
        frequencyNote: form.frequencyNote.trim() || null,
      });
      await replaceRoutineItems(db, routineId, toRoutineItemInputs(form.items));
      router.back();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    setArchiving(true);
    setArchiveError(null);
    try {
      const db = (await getDb()) as unknown as Db;
      await setRoutineArchived(db, routineId, true);
      router.back();
    } catch {
      setArchiveError('Something went wrong. Please try again.');
    } finally {
      setArchiving(false);
    }
  }

  if (loadError !== null) {
    return (
      <Screen showBack>
        <Text style={logScreenStyles.saveErrorText} testID="routine-edit-load-error">
          {loadError}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen showBack>
      <KeyboardAvoidingView
        style={routineStyles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={logScreenStyles.screenContent}>
          <TextInput
            style={routineStyles.nameInput}
            value={form.name}
            onChangeText={form.setName}
            placeholder="Routine name"
            placeholderTextColor={colors.chrome}
            testID="routine-edit-name-input"
            returnKeyType="done"
          />

          <FocusDropdown
            selectedId={form.associatedFocusId}
            onSelect={(id) => form.setAssociatedFocusId(id)}
            testID="routine-edit-focus-dropdown"
          />

          <TextInput
            style={routineStyles.detailInput}
            value={form.frequencyNote}
            onChangeText={form.setFrequencyNote}
            placeholder="e.g. 3x daily as prescribed (optional)"
            placeholderTextColor={colors.chrome}
            testID="routine-edit-frequency-note"
            returnKeyType="done"
          />

          <Text style={routineStyles.sectionLabel}>When</Text>
          <View style={routineStyles.timeBlockRow}>
            {SCHEDULEABLE_BLOCKS.map((block) => {
              const selected = form.selectedBlocks.has(block);
              return (
                <Pressable
                  key={block}
                  style={[routineStyles.blockChip, selected && routineStyles.blockChipSelected]}
                  onPress={() => form.toggleBlock(block)}
                  testID={`routine-edit-time-block-${block}`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[routineStyles.blockChipText, selected && routineStyles.blockChipTextSelected]}>
                    {block}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {form.items.map((item, index) => (
            <RoutineItemEditor
              key={item.key}
              index={index}
              item={item}
              entryTypes={entryTypes}
              totalItems={form.items.length}
              testIDPrefix={`routine-edit-item-${index}`}
              onUpdate={(patch) => form.updateItem(item.key, patch)}
              onRemove={() => form.removeItem(item.key)}
              onMoveUp={() => form.moveItem(index, 'up')}
              onMoveDown={() => form.moveItem(index, 'down')}
            />
          ))}

          <Pressable
            style={routineStyles.addItemButton}
            onPress={form.addItem}
            testID="routine-edit-add-item-button"
          >
            <Text style={routineStyles.addItemText}>+ Add Item</Text>
          </Pressable>

          {error !== null && (
            <Text style={logScreenStyles.saveErrorText} testID="routine-edit-save-error">
              {error}
            </Text>
          )}

          {form.canSave && (
            <View style={logScreenStyles.saveButton}>
              <Button
                label="Save"
                onPress={() => { void handleSave(); }}
                disabled={saving || archiving}
                testID="routine-edit-save-button"
              />
            </View>
          )}

          <View style={styles.archiveSeparator} />

          {archiveError !== null && (
            <Text style={logScreenStyles.saveErrorText} testID="routine-edit-archive-error">
              {archiveError}
            </Text>
          )}

          <View style={styles.archiveButtonContainer}>
            <Button
              label="Archive"
              onPress={() => { void handleArchive(); }}
              disabled={archiving || saving}
              testID="routine-edit-archive-button"
              variant="secondary"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  archiveSeparator: {
    height: 1,
    backgroundColor: colors.chrome,
    opacity: 0.2,
    marginTop: spacing.sectionGap,
    marginBottom: spacing.sectionGap,
  },
  archiveButtonContainer: {
    marginTop: 0,
  },
});
