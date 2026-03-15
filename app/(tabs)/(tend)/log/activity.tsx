import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, SearchBar, Chip, Button, SaveConfirmation } from '@/components';
import { useEntryTypes } from '@/hooks';
import { getLabels, saveEntry, createLabel } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { nowLocalIso } from '@/lib/utils/timestamp';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import { colorForActivityLabel } from '@/constants/chipColors';
import { logScreenStyles } from '@/constants/sharedStyles';
import type { Db } from '@/lib/db/queries';
import type { Label } from '@/lib/db/query-types';

const SUGGESTION_LIMIT = 5;

interface ChipItem {
  labelId: number;
  name: string;
  categoryName: string | null;
}

export default function LogActivityScreen() {
  const router = useRouter();
  const { entryTypes } = useEntryTypes();
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<Label[]>([]);
  const [chips, setChips] = useState<ChipItem[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const activityEntryType = entryTypes.find((t) => t.name === 'Activity');

  const fetchSuggestions = useCallback(async () => {
    if (!activityEntryType) return;
    const db = (await getDb()) as unknown as Db;
    const currentIds = chips.map((c) => c.labelId);
    const options = search.length > 0
      ? { search, limit: SUGGESTION_LIMIT }
      : { limit: SUGGESTION_LIMIT };
    const labels = await getLabels(db, activityEntryType.id, options);
    setSuggestions(labels.filter((l) => !currentIds.includes(l.id)));
  }, [activityEntryType, search, chips]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSuggestions();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchSuggestions]);

  function handleSelect(label: Label) {
    setChips((prev) => [...prev, { labelId: label.id, name: label.name, categoryName: label.categoryName }]);
    setSearch('');
  }

  function handleRemove(labelId: number) {
    setChips((prev) => prev.filter((c) => c.labelId !== labelId));
  }

  async function handleAddCustom() {
    if (!activityEntryType || search.trim() === '') return;
    const db = (await getDb()) as unknown as Db;
    const label = await createLabel(db, activityEntryType.id, search.trim());
    setChips((prev) => [...prev, { labelId: label.id, name: label.name, categoryName: label.categoryName }]);
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
      });
      setShowConfirmation(true);
    } catch (err) {
      console.error('[LogActivityScreen] failed to save entry:', err);
    }
  }

  function handleDismiss() {
    router.replace("/");
  }

  const showAddCustom = search.trim().length > 0 && suggestions.length === 0;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
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

          {/* Suggestions — 3–5 tappable chips, not a full list */}
          {(suggestions.length > 0 || showAddCustom) && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((label) => (
                <Pressable
                  key={label.id}
                  onPress={() => handleSelect(label)}
                  testID={`activity-suggestion-${label.id}`}
                >
                  <View style={styles.suggestionChip}>
                    <Text style={styles.suggestionChipText}>{label.name}</Text>
                  </View>
                </Pressable>
              ))}

              {showAddCustom && (
                <Pressable
                  onPress={() => { void handleAddCustom(); }}
                  testID="activity-add-custom"
                >
                  <View style={styles.suggestionChip}>
                    <Text style={styles.addCustomText}>+ Add "{search.trim()}"</Text>
                  </View>
                </Pressable>
              )}
            </View>
          )}

          {/* Selected chip tray */}
          {chips.length > 0 && (
            <View style={styles.chipTray}>
              {chips.map((chip) => (
                <Chip
                  key={chip.labelId}
                  label={chip.name}
                  color={colorForActivityLabel(chip)}
                  onRemove={() => handleRemove(chip.labelId)}
                  testID={`activity-chip-${chip.labelId}`}
                />
              ))}
            </View>
          )}

          {chips.length > 0 && (
            <View style={logScreenStyles.saveButton}>
              <Button
                label="Save"
                onPress={() => { void handleSave(); }}
                testID="activity-save-button"
              />
            </View>
          )}
        </View>
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
  content: {
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
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.elementGap,
    marginTop: spacing.elementGap,
  },
  suggestionChip: {
    paddingHorizontal: spacing.elementGap,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.chrome,
    backgroundColor: colors.surface,
  },
  suggestionChipText: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
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
});
