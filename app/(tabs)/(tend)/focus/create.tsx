import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, SearchBar, Chip } from '@/components';
import { Button } from '@/components/Button';
import { createFocus, searchLabelsAcross } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import { logScreenStyles } from '@/constants/sharedStyles';
import type { Db } from '@/lib/db/queries';
import type { Label } from '@/lib/db/query-types';

const SUGGESTION_LIMIT = 5;

export default function CreateFocusScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [rawSuggestions, setRawSuggestions] = useState<Label[]>([]);
  const [chips, setChips] = useState<Label[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSeq = useRef(0);

  const fetchSuggestions = useCallback(async () => {
    if (search.length === 0) {
      setRawSuggestions([]);
      return;
    }
    const seq = ++fetchSeq.current;
    const db = (await getDb()) as unknown as Db;
    const labels = await searchLabelsAcross(db, search, SUGGESTION_LIMIT);
    if (seq === fetchSeq.current) {
      setRawSuggestions(labels);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSuggestions();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchSuggestions]);

  const selectedIds = useMemo(() => new Set(chips.map((c) => c.id)), [chips]);

  const suggestions = useMemo(
    () => rawSuggestions.filter((l) => !selectedIds.has(l.id)),
    [rawSuggestions, selectedIds],
  );

  function handleSelect(label: Label) {
    setChips((prev) => [...prev, label]);
    setSearch('');
  }

  function handleRemove(labelId: number) {
    setChips((prev) => prev.filter((c) => c.id !== labelId));
  }

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const db = (await getDb()) as unknown as Db;
      await createFocus(db, {
        name: trimmedName,
        labelIds: chips.map((c) => c.id),
      });
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
        <View style={logScreenStyles.screenContent}>
          <Text style={logScreenStyles.prompt}>New focus</Text>

          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={colors.chrome}
            autoFocus
            testID="focus-name-input"
            returnKeyType="done"
          />

          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search labels to pin"
            testID="focus-label-search"
          />

          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((label) => (
                <Pressable
                  key={label.id}
                  style={styles.suggestionChip}
                  onPress={() => handleSelect(label)}
                  testID={`focus-suggestion-${label.id}`}
                >
                  <Text style={styles.suggestionChipText}>{label.name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {search.length === 0 && chips.length === 0 && (
            <Text style={styles.emptyHint}>
              Log an entry first to see new labels here
            </Text>
          )}

          {chips.length > 0 && (
            <View style={styles.chipTray}>
              {chips.map((chip) => (
                <Chip
                  key={chip.id}
                  label={chip.name}
                  color={colors.chrome}
                  onRemove={() => handleRemove(chip.id)}
                  testID={`focus-chip-${chip.id}`}
                />
              ))}
            </View>
          )}

          {error !== null && (
            <Text style={logScreenStyles.saveErrorText} testID="focus-save-error">
              {error}
            </Text>
          )}

          {canSave && (
            <View style={logScreenStyles.saveButton}>
              <Button
                label="Save"
                onPress={() => { void handleSave(); }}
                disabled={saving}
                testID="focus-save-button"
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

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
  chipTray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.elementGap,
    marginTop: spacing.sectionGap,
  },
  emptyHint: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.chrome,
    marginTop: spacing.elementGap,
  },
});
