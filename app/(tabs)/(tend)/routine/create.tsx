import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components';
import { Button } from '@/components/Button';
import { FocusDropdown } from '@/components/FocusDropdown';
import { RoutineItemEditor } from '@/components/RoutineItemEditor';
import { createRoutine, getEntryTypes } from '@/lib/db/queries';
import { getTypedDb } from '@/lib/db/typed-db';
import { getScheduleableBlocks } from '@/lib/utils/timestamp';
import { colors } from '@/constants/theme';
import { logScreenStyles, routineStyles } from '@/constants/sharedStyles';
import { useRoutineForm, toRoutineItemInputs } from '@/hooks/useRoutineForm';
import type { EntryType } from '@/lib/db/query-types';

const SCHEDULEABLE_BLOCKS = getScheduleableBlocks();

export default function CreateRoutineScreen() {
  const router = useRouter();
  const form = useRoutineForm();
  const [entryTypes, setEntryTypes] = useState<EntryType[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const db = await getTypedDb();
        const types = await getEntryTypes(db);
        if (isMounted) setEntryTypes(types);
      } catch {
        if (isMounted) setLoadError("Couldn't load entry types. Go back and try again.");
      }
    }
    void load();
    return () => { isMounted = false; };
  }, []);

  async function handleSave() {
    if (!form.canSave) return;
    setSaving(true);
    setError(null);
    try {
      const db = await getTypedDb();
      await createRoutine(db, {
        name: form.name.trim(),
        timeBlocks: Array.from(form.selectedBlocks),
        associatedFocusId: form.associatedFocusId,
        frequencyNote: form.frequencyNote.trim() || undefined,
        items: toRoutineItemInputs(form.items),
      });
      router.back();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen showBack>
      <KeyboardAvoidingView
        style={routineStyles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={logScreenStyles.scrollContent}>
          <TextInput
            style={routineStyles.nameInput}
            value={form.name}
            onChangeText={form.setName}
            placeholder="Routine name"
            placeholderTextColor={colors.chrome}
            autoFocus
            testID="routine-name-input"
            returnKeyType="done"
          />

          <FocusDropdown
            selectedId={form.associatedFocusId}
            onSelect={(id) => form.setAssociatedFocusId(id)}
            testID="routine-focus-dropdown"
          />

          <TextInput
            style={routineStyles.detailInput}
            value={form.frequencyNote}
            onChangeText={form.setFrequencyNote}
            placeholder="e.g. 3x daily as prescribed (optional)"
            placeholderTextColor={colors.chrome}
            testID="routine-frequency-note"
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
                  testID={`routine-time-block-${block}`}
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
              testIDPrefix={`routine-item-${index}`}
              onUpdate={(patch) => form.updateItem(item.key, patch)}
              onRemove={() => form.removeItem(item.key)}
              onMoveUp={() => form.moveItem(index, 'up')}
              onMoveDown={() => form.moveItem(index, 'down')}
            />
          ))}

          <Pressable
            style={routineStyles.addItemButton}
            onPress={form.addItem}
            testID="routine-add-item-button"
          >
            <Text style={routineStyles.addItemText}>+ Add Item</Text>
          </Pressable>

          {loadError !== null && (
            <Text style={logScreenStyles.saveErrorText} testID="routine-load-error">
              {loadError}
            </Text>
          )}

          {error !== null && (
            <Text style={logScreenStyles.saveErrorText} testID="routine-save-error">
              {error}
            </Text>
          )}

          {form.canSave && (
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
