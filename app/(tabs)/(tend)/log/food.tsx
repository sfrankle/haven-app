import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { nowLocalIso, getMealContext } from '@/lib/utils/timestamp';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import { colorForFoodLabel } from '@/constants/chipColors';
import { logScreenStyles } from '@/constants/sharedStyles';
import type { Db } from '@/lib/db/queries';
import type { Label } from '@/lib/db/query-types';

const SUGGESTION_LIMIT = 5;

export default function LogFoodScreen() {
  const router = useRouter();
  const { entryTypes } = useEntryTypes();
  const [search, setSearch] = useState('');
  const [rawSuggestions, setRawSuggestions] = useState<Label[]>([]);
  const [chips, setChips] = useState<Label[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const foodEntryType = entryTypes.find((t) => t.name === 'Food');
  const mealContext = getMealContext(nowLocalIso());

  const fetchSuggestions = useCallback(async () => {
    if (!foodEntryType) return;
    const db = (await getDb()) as unknown as Db;
    const options = search.length > 0
      ? { search, limit: SUGGESTION_LIMIT }
      : { limit: SUGGESTION_LIMIT };
    const labels = await getLabels(db, foodEntryType.id, options);
    setRawSuggestions(labels);
  }, [foodEntryType, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSuggestions();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchSuggestions]);

  const suggestions = useMemo(() => {
    const selectedIds = new Set(chips.map((c) => c.id));
    return rawSuggestions.filter((l) => !selectedIds.has(l.id));
  }, [rawSuggestions, chips]);

  function handleSelect(label: Label) {
    setChips((prev) => [...prev, label]);
    setSearch('');
  }

  function handleRemove(labelId: number) {
    setChips((prev) => prev.filter((c) => c.id !== labelId));
  }

  async function handleAddCustom() {
    if (!foodEntryType || search.trim() === '') return;
    const db = (await getDb()) as unknown as Db;
    const label = await createLabel(db, foodEntryType.id, search.trim());
    setChips((prev) => [...prev, label]);
    setSearch('');
  }

  async function handleSave() {
    if (!foodEntryType || chips.length === 0) return;
    const db = (await getDb()) as unknown as Db;
    try {
      await saveEntry(db, {
        entryTypeId: foodEntryType.id,
        timestamp: nowLocalIso(),
        labelIds: chips.map((c) => c.id),
      });
      setShowConfirmation(true);
    } catch (err) {
      console.error('[LogFoodScreen] failed to save entry:', err);
    }
  }

  function handleDismiss() {
    router.replace('/');
  }

  const showAddCustom = search.trim().length > 0 && suggestions.length === 0;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={logScreenStyles.screenContent}>
          <Text style={logScreenStyles.prompt}>
            {foodEntryType?.prompt ?? 'What did you eat?'}
          </Text>

          <Text style={styles.mealContext}>{mealContext}</Text>

          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search foods"
            autoFocus
            testID="food-search"
          />

          {/* Suggestions — 3–5 tappable chips, not a full list */}
          {(suggestions.length > 0 || showAddCustom) && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((label) => (
                <Pressable
                  key={label.id}
                  style={styles.suggestionChip}
                  onPress={() => handleSelect(label)}
                  testID={`food-suggestion-${label.id}`}
                >
                  <Text style={styles.suggestionChipText}>{label.name}</Text>
                </Pressable>
              ))}

              {showAddCustom && (
                <Pressable
                  style={styles.suggestionChip}
                  onPress={() => { void handleAddCustom(); }}
                  testID="food-add-custom"
                >
                  <Text style={styles.addCustomText}>+ Add "{search.trim()}"</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Selected chip tray */}
          {chips.length > 0 && (
            <View style={styles.chipTray}>
              {chips.map((chip) => (
                <Chip
                  key={chip.id}
                  label={chip.name}
                  color={colorForFoodLabel(chip)}
                  onRemove={() => handleRemove(chip.id)}
                  testID={`food-chip-${chip.id}`}
                />
              ))}
            </View>
          )}

          {chips.length > 0 && (
            <View style={logScreenStyles.saveButton}>
              <Button
                label="Save"
                onPress={() => { void handleSave(); }}
                testID="food-save-button"
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      <SaveConfirmation
        visible={showConfirmation}
        onDismiss={handleDismiss}
        testID="food-save-confirmation"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  mealContext: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.chrome,
    marginBottom: spacing.elementGap,
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
