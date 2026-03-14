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
import { Screen, SearchBar, Chip, Button, SaveConfirmation } from '@/components';
import { useEntryTypes } from '@/hooks';
import { getLabels, saveEntry, createLabel } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { nowLocalIso } from '@/lib/utils/timestamp';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import { CATEGORY_CHIP_COLORS, CATEGORY_CHIP_COLOR_FALLBACK } from '@/constants/chipColors';
import type { Db } from '@/lib/db/queries';
import type { Label } from '@/lib/db/query-types';

interface ChipItem {
  labelId: number;
  name: string;
  color: string;
}

function colorForLabel(label: Label): string {
  if (label.categoryName && label.categoryName in CATEGORY_CHIP_COLORS) {
    return CATEGORY_CHIP_COLORS[label.categoryName];
  }
  return CATEGORY_CHIP_COLOR_FALLBACK;
}

export default function LogActivityScreen() {
  const router = useRouter();
  const { entryTypes } = useEntryTypes();
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<Label[]>([]);
  const [chips, setChips] = useState<ChipItem[]>([]);
  const [notes, setNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const activityEntryType = entryTypes.find((t) => t.name === 'Activity');

  // Fetch suggestions with debounce whenever search or chips change.
  const selectedIds = chips.map((c) => c.labelId);

  const fetchSuggestions = useCallback(async () => {
    if (!activityEntryType) return;
    const db = (await getDb()) as unknown as Db;
    const options = search.length > 0 ? { search } : {};
    const labels = await getLabels(db, activityEntryType.id, options);
    const filtered = labels.filter((l) => !selectedIds.includes(l.id));
    setSuggestions(filtered);
  }, [activityEntryType, search, selectedIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSuggestions();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchSuggestions]);

  function handleSelect(label: Label) {
    const color = colorForLabel(label);
    setChips((prev) => [...prev, { labelId: label.id, name: label.name, color }]);
    setSearch('');
  }

  function handleRemove(labelId: number) {
    setChips((prev) => prev.filter((c) => c.labelId !== labelId));
  }

  async function handleAddCustom() {
    if (!activityEntryType || search.trim() === '') return;
    const db = (await getDb()) as unknown as Db;
    const label = await createLabel(db, activityEntryType.id, search.trim());
    const color = colorForLabel(label);
    setChips((prev) => [...prev, { labelId: label.id, name: label.name, color }]);
    setSearch('');
  }

  async function handleSave() {
    if (!activityEntryType || chips.length === 0) return;
    const db = (await getDb()) as unknown as Db;
    try {
      await saveEntry(db, {
        entryTypeId: activityEntryType.id,
        timestamp: nowLocalIso(),
        labelIds: chips.map((c) => c.labelId),
        notes: notes.trim() !== '' ? notes.trim() : undefined,
      });
      setShowConfirmation(true);
    } catch (err) {
      console.error('[LogActivityScreen] failed to save entry:', err);
    }
  }

  function handleDismiss() {
    router.back();
  }

  const showAddCustom = search.trim().length > 0 && suggestions.length === 0;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.prompt}>
            {activityEntryType?.prompt ?? 'What did you do today?'}
          </Text>

          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search activities"
            autoFocus
            testID="activity-search"
          />

          {/* Suggestion list — fixed height so chip tray stays anchored below */}
          <View style={styles.suggestionsContainer}>
            {suggestions.map((label) => (
              <Pressable
                key={label.id}
                style={styles.suggestionRow}
                onPress={() => handleSelect(label)}
                testID={`activity-suggestion-${label.id}`}
              >
                <Text style={styles.suggestionText}>{label.name}</Text>
                {label.categoryName ? (
                  <Text style={styles.categoryBadge}>{label.categoryName}</Text>
                ) : null}
              </Pressable>
            ))}

            {showAddCustom && (
              <Pressable
                style={styles.suggestionRow}
                onPress={() => { void handleAddCustom(); }}
                testID="activity-add-custom"
              >
                <Text style={styles.addCustomText}>+ Add "{search.trim()}"</Text>
              </Pressable>
            )}
          </View>

          {/* Chip tray */}
          {chips.length > 0 && (
            <View style={styles.chipTray}>
              {chips.map((chip) => (
                <Chip
                  key={chip.labelId}
                  label={chip.name}
                  color={chip.color}
                  onRemove={() => handleRemove(chip.labelId)}
                  testID={`activity-chip-${chip.labelId}`}
                />
              ))}
            </View>
          )}

          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.chrome}
            multiline
            numberOfLines={3}
            testID="activity-notes"
          />

          {chips.length > 0 && (
            <View style={styles.saveButton}>
              <Button
                label="Save"
                onPress={() => { void handleSave(); }}
                testID="activity-save-button"
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <SaveConfirmation
        visible={showConfirmation}
        onDismiss={handleDismiss}
        testID="activity-save-confirmation"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.sectionGap,
    paddingBottom: spacing.sectionGap,
  },
  prompt: {
    fontFamily: typeScale.titleLarge.family,
    fontWeight: typeScale.titleLarge.weight,
    fontSize: typeScale.titleLarge.size,
    lineHeight: lineHeight(typeScale.titleLarge),
    color: colors.ink,
    marginBottom: spacing.sectionGap,
  },
  suggestionsContainer: {
    marginTop: spacing.elementGap,
    maxHeight: 240,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.chrome + '40',
    minHeight: 48,
  },
  suggestionText: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
    flex: 1,
  },
  categoryBadge: {
    fontFamily: typeScale.labelLarge.family,
    fontSize: typeScale.labelLarge.size,
    lineHeight: lineHeight(typeScale.labelLarge),
    color: colors.chrome,
    marginLeft: spacing.elementGap,
  },
  addCustomText: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.glow,
  },
  chipTray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.elementGap,
    marginTop: spacing.sectionGap,
  },
  notesInput: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.chrome,
    paddingVertical: spacing.elementGap,
    marginTop: spacing.sectionGap,
    marginBottom: spacing.sectionGap,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: spacing.elementGap,
  },
});
