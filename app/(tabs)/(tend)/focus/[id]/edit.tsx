import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { Screen, SearchBar, ChipTray } from '@/components';
import { Button } from '@/components/Button';
import {
  getFocuses,
  getFocusItems,
  updateFocus,
  setFocusArchived,
  searchLabelsAcross,
} from '@/lib/db/queries';
import { getTypedDb } from '@/lib/db/typed-db';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import { logScreenStyles } from '@/constants/sharedStyles';
import type { Label } from '@/lib/db/query-types';

const SUGGESTION_LIMIT = 5;

export default function EditFocusScreen() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const focusId = Number(idParam);

  const [name, setName] = useState('');
  const [chips, setChips] = useState<Label[]>([]);
  const [historicalLabels, setHistoricalLabels] = useState<Label[]>([]);
  const [search, setSearch] = useState('');
  const [rawSuggestions, setRawSuggestions] = useState<Label[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const fetchSeq = useRef(0);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const db = await getTypedDb();
        const [focuses, items] = await Promise.all([
          getFocuses(db, { includeArchived: true }),
          getFocusItems(db, focusId),
        ]);
        if (!isMounted) return;

        const focus = focuses.find((f) => f.id === focusId);
        if (focus) {
          setName(focus.name);
        }

        const pinned = items.filter((i) => i.source === 'pinned');
        const historical = items.filter((i) => i.source === 'historical');

        setChips(
          pinned.map((i) => ({
            id: i.labelId,
            name: i.labelName,
            entryTypeId: i.entryTypeId,
            parentId: null,
            categoryId: null,
            categoryName: null,
            sortOrder: 0,
          }))
        );

        setHistoricalLabels(
          historical.map((i) => ({
            id: i.labelId,
            name: i.labelName,
            entryTypeId: i.entryTypeId,
            parentId: null,
            categoryId: null,
            categoryName: null,
            sortOrder: 0,
          }))
        );
      } catch {
        // load errors are non-fatal; screen stays empty
      }
    }
    void load();
    return () => { isMounted = false; };
  }, [focusId]);

  const fetchSuggestions = useCallback(async () => {
    if (search.length === 0) {
      setRawSuggestions([]);
      return;
    }
    const seq = ++fetchSeq.current;
    const db = await getTypedDb();
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
    [rawSuggestions, selectedIds]
  );

  function handleSelect(label: Label) {
    setChips((prev) => [...prev, label]);
    setSearch('');
  }

  function handleRemove(labelId: number | 'energy') {
    if (labelId === 'energy') return;
    setChips((prev) => prev.filter((c) => c.id !== labelId));
  }

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const db = await getTypedDb();
      await updateFocus(db, focusId, {
        name: trimmedName,
        labelIds: chips.map((c) => c.id),
      });
      setSaving(false);
      router.back();
    } catch {
      setError('A Focus with that name already exists.');
      setSaving(false);
    }
  }

  async function handleArchive() {
    setArchiving(true);
    setArchiveError(null);
    try {
      const db = await getTypedDb();
      await setFocusArchived(db, focusId, true);
      setArchiving(false);
      router.back();
    } catch {
      setArchiveError('Something went wrong. Please try again.');
      setArchiving(false);
    }
  }

  return (
    <Screen showBack>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={logScreenStyles.screenContent}>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={colors.chrome}
            testID="focus-edit-name-input"
            returnKeyType="done"
          />

          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search labels to pin"
            testID="focus-edit-label-search"
          />

          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((label) => (
                <Pressable
                  key={label.id}
                  style={styles.outlineChip}
                  onPress={() => handleSelect(label)}
                  testID={`focus-edit-suggestion-${label.id}`}
                >
                  <Text style={styles.outlineChipText}>{label.name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {chips.length > 0 && (
            <ChipTray
              chips={chips.map((c) => ({ id: c.id, label: c.name, color: colors.chrome }))}
              onRemove={handleRemove}
              testID="focus-edit"
            />
          )}

          {historicalLabels.length > 0 && (
            <View style={styles.historicalSection}>
              <Text style={styles.historicalHeading}>Noticed in past entries</Text>
              <View style={styles.historicalChips}>
                {historicalLabels.map((l) => (
                  <View
                    key={l.id}
                    style={[styles.outlineChip, styles.outlineChipMuted]}
                    testID={`focus-edit-historical-label-${l.id}`}
                  >
                    <Text style={styles.outlineChipText}>{l.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {error !== null && (
            <Text style={logScreenStyles.saveErrorText} testID="focus-edit-save-error">
              {error}
            </Text>
          )}

          {archiveError !== null && (
            <Text style={logScreenStyles.saveErrorText} testID="focus-edit-archive-error">
              {archiveError}
            </Text>
          )}

          {canSave && (
            <View style={logScreenStyles.saveButton}>
              <Button
                label="Save"
                onPress={() => { void handleSave(); }}
                disabled={saving}
                testID="focus-edit-save-button"
              />
            </View>
          )}

          <View style={styles.archiveSeparator} />

          <View style={styles.archiveButton}>
            <Button
              label="Archive"
              onPress={() => { void handleArchive(); }}
              disabled={archiving}
              testID="focus-edit-archive-button"
              variant="secondary"
            />
          </View>
        </ScrollView>
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
  outlineChip: {
    paddingHorizontal: spacing.elementGap,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.chrome,
    backgroundColor: colors.surface,
  },
  outlineChipMuted: {
    opacity: 0.5,
  },
  outlineChipText: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
  },
  historicalSection: {
    marginTop: spacing.sectionGap,
  },
  historicalHeading: {
    fontFamily: typeScale.labelMedium.family,
    fontWeight: typeScale.labelMedium.weight,
    fontSize: typeScale.labelMedium.size,
    lineHeight: lineHeight(typeScale.labelMedium),
    color: colors.chrome,
    marginBottom: spacing.elementGap,
  },
  historicalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.elementGap,
  },
  archiveSeparator: {
    height: 1,
    backgroundColor: colors.chrome,
    opacity: 0.2,
    marginTop: spacing.sectionGap,
    marginBottom: spacing.sectionGap,
  },
  archiveButton: {
    marginTop: 0,
  },
});
