import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Screen,
  SearchBar,
  ChipTray,
  LogFormShell,
  EnergySlider,
  SeverityRow,
} from '@/components';
import { useEntryTypes } from '@/hooks';
import {
  getPhysicalStateLabels,
  getPhysicalParentLabels,
  saveEntry,
  createLabel,
} from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { nowLocalIso } from '@/lib/utils/timestamp';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import { colorForPhysicalLabel } from '@/constants/chipColors';
import { logScreenStyles } from '@/constants/sharedStyles';
import type { Db } from '@/lib/db/queries';
import type { PhysicalStateLabel } from '@/lib/db/query-types';

// ─── Types ─────────────────────────────────────────────────────────────────

type EnergyChip = {
  kind: 'energy';
  id: 'energy';
  value: number; // 1-5
};

type StateChip = {
  kind: 'state';
  id: number; // labelId
  labelName: string;
  parentName: string | null;
  severity: number | null; // 1-5 or null
};

type PhysicalChip = EnergyChip | StateChip;

// ─── Helpers ───────────────────────────────────────────────────────────────

const WHOLE_BODY_NAMES = ['whole body', 'body'];

function formatChipLabel(chip: PhysicalChip): string {
  if (chip.kind === 'energy') {
    return `Energy: ${chip.value}/5`;
  }
  const parentName = chip.parentName;
  const showPrefix =
    parentName !== null &&
    !WHOLE_BODY_NAMES.includes(parentName.toLowerCase());
  const base = showPrefix ? `${parentName}: ${chip.labelName}` : chip.labelName;
  if (chip.severity !== null) {
    return `${base} (${chip.severity}/5)`;
  }
  return base;
}

const SUGGESTION_LIMIT = 5;
const SEVERITY_AUTO_DISMISS_MS = 2000;

// ─── Screen ────────────────────────────────────────────────────────────────

export default function LogPhysicalScreen() {
  const { entryTypes } = useEntryTypes();
  const [search, setSearch] = useState('');
  const [rawSuggestions, setRawSuggestions] = useState<PhysicalStateLabel[]>([]);
  const [chips, setChips] = useState<PhysicalChip[]>([]);
  const [activeSeverityChipId, setActiveSeverityChipId] = useState<number | null>(null);
  const severityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const energyLabelIdRef = useRef<number | null>(null);

  const physicalEntryType = entryTypes.find((t) => t.name === 'Physical');

  // ── Fetch suggestions + cache Energy label ID ──────────────────────────

  const fetchSuggestions = useCallback(async () => {
    if (!physicalEntryType) return;
    const db = (await getDb()) as unknown as Db;

    if (energyLabelIdRef.current === null) {
      const parentLabels = await getPhysicalParentLabels(db, physicalEntryType.id);
      const energyLabel = parentLabels.find((l) => l.name.toLowerCase() === 'energy');
      energyLabelIdRef.current = energyLabel?.id ?? null;
    }

    const options =
      search.length > 0
        ? { search, limit: SUGGESTION_LIMIT }
        : { limit: SUGGESTION_LIMIT };
    const labels = await getPhysicalStateLabels(db, physicalEntryType.id, options);
    setRawSuggestions(labels);
  }, [physicalEntryType, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSuggestions();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchSuggestions]);

  // ── Derived ────────────────────────────────────────────────────────────

  const selectedStateIds = useMemo(
    () => new Set(chips.filter((c) => c.kind === 'state').map((c) => c.id as number)),
    [chips]
  );

  const suggestions = useMemo(
    () => rawSuggestions.filter((l) => !selectedStateIds.has(l.id)),
    [rawSuggestions, selectedStateIds]
  );

  const hasEnergyChip = chips.some((c) => c.kind === 'energy');
  const canSubmit = chips.length > 0;
  const showAddCustom = search.trim().length > 0 && suggestions.length === 0;

  // ── Handlers ───────────────────────────────────────────────────────────

  function handleEnergyChange(value: number) {
    setChips((prev) => {
      const withoutEnergy = prev.filter((c) => c.kind !== 'energy');
      const energyChip: EnergyChip = { kind: 'energy', id: 'energy', value };
      return [energyChip, ...withoutEnergy];
    });
  }

  function handleSelectState(label: PhysicalStateLabel) {
    const chip: StateChip = {
      kind: 'state',
      id: label.id,
      labelName: label.name,
      parentName: label.parentName,
      severity: null,
    };
    setChips((prev) => [...prev, chip]);
    setSearch('');
    openSeverityRow(label.id);
  }

  function handleRemoveChip(chipId: 'energy' | number) {
    if (chipId === 'energy') {
      setChips((prev) => prev.filter((c) => c.kind !== 'energy'));
    } else {
      setChips((prev) => prev.filter((c) => !(c.kind === 'state' && c.id === chipId)));
    }
    if (activeSeverityChipId === chipId) {
      setActiveSeverityChipId(null);
    }
  }

  function openSeverityRow(chipId: number) {
    if (severityTimerRef.current) clearTimeout(severityTimerRef.current);
    setActiveSeverityChipId(chipId);
    severityTimerRef.current = setTimeout(() => {
      setActiveSeverityChipId(null);
    }, SEVERITY_AUTO_DISMISS_MS);
  }

  function handleSeverityChange(severity: number) {
    if (activeSeverityChipId === null) return;
    const id = activeSeverityChipId;
    setChips((prev) =>
      prev.map((c) => {
        if (c.kind !== 'state' || c.id !== id) return c;
        // tapping the already-selected value clears severity
        return { ...c, severity: c.severity === severity ? null : severity };
      })
    );
    if (severityTimerRef.current) clearTimeout(severityTimerRef.current);
    setActiveSeverityChipId(null);
  }

  function handleSeverityDismiss() {
    if (severityTimerRef.current) clearTimeout(severityTimerRef.current);
    setActiveSeverityChipId(null);
  }

  async function handleAddCustom() {
    if (!physicalEntryType || search.trim() === '') return;
    const db = (await getDb()) as unknown as Db;
    const label = await createLabel(db, physicalEntryType.id, search.trim());
    const chip: StateChip = {
      kind: 'state',
      id: label.id,
      labelName: label.name,
      parentName: null,
      severity: null,
    };
    setChips((prev) => [...prev, chip]);
    setSearch('');
  }

  async function handleSave(extras: { notes?: string; focusId?: number }) {
    if (!physicalEntryType || chips.length === 0) return;
    const db = (await getDb()) as unknown as Db;
    const ts = nowLocalIso();

    await Promise.all(chips.map((chip) => {
      if (chip.kind === 'energy') {
        return saveEntry(db, {
          entryTypeId: physicalEntryType.id,
          timestamp: ts,
          numericValue: chip.value,
          labelIds: energyLabelIdRef.current !== null ? [energyLabelIdRef.current] : [],
          notes: extras.notes,
          focusId: extras.focusId,
        });
      } else {
        return saveEntry(db, {
          entryTypeId: physicalEntryType.id,
          timestamp: ts,
          numericValue: chip.severity ?? undefined,
          labelIds: [chip.id],
          notes: extras.notes,
          focusId: extras.focusId,
        });
      }
    }));
  }

  useEffect(() => {
    return () => {
      if (severityTimerRef.current) clearTimeout(severityTimerRef.current);
    };
  }, []);

  return (
    <Screen showBack>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={logScreenStyles.screenContent}>
          <Text style={logScreenStyles.prompt}>
            {physicalEntryType?.prompt ?? physicalEntryType?.name}
          </Text>

          {/* Energy section */}
          <View style={styles.energySection}>
            <Text style={styles.sectionHeader}>Reserves</Text>
            <EnergySlider
              value={hasEnergyChip
                ? (chips.find((c) => c.kind === 'energy') as EnergyChip | undefined)?.value ?? null
                : null}
              onChange={handleEnergyChange}
              testID="energy-slider"
            />
          </View>

          {/* Sensations section */}
          <Text style={styles.sectionHeader}>Sensations</Text>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search sensations"
            testID="physical-search"
          />

          {/* Suggestions */}
          {(suggestions.length > 0 || showAddCustom) && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((label) => (
                <Pressable
                  key={label.id}
                  style={styles.suggestionChip}
                  onPress={() => handleSelectState(label)}
                  testID={`physical-suggestion-${label.id}`}
                >
                  <Text style={styles.suggestionChipText}>{label.name}</Text>
                </Pressable>
              ))}

              {showAddCustom && (
                <Pressable
                  style={styles.suggestionChip}
                  onPress={() => { void handleAddCustom(); }}
                  testID="physical-add-custom"
                >
                  <Text style={styles.addCustomText}>+ Add "{search.trim()}"</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Severity row — appears when a chip's severity icon is tapped */}
          {activeSeverityChipId !== null && (
            <SeverityRow
              value={
                (chips.find(
                  (c) => c.kind === 'state' && c.id === activeSeverityChipId
                ) as StateChip | undefined)?.severity ?? null
              }
              onChange={handleSeverityChange}
              onDismiss={handleSeverityDismiss}
              testID="physical-severity-row"
            />
          )}

          {/* Chip tray */}
          {chips.length > 0 && (
            <ChipTray
              chips={chips.map((chip) =>
                chip.kind === 'energy'
                  ? {
                      id: 'energy' as const,
                      label: formatChipLabel(chip),
                      color: colorForPhysicalLabel(),
                    }
                  : {
                      id: chip.id,
                      label: formatChipLabel(chip),
                      color: colorForPhysicalLabel(),
                      onOpenSeverity: () => openSeverityRow(chip.id),
                    }
              )}
              onRemove={handleRemoveChip}
              testID="physical"
            />
          )}

          <LogFormShell
            canSubmit={canSubmit}
            onSave={handleSave}
            saveButtonTestID="physical-save-button"
            notesTestID="physical-notes-input"
            errorTestID="physical-save-error"
            confirmationTestID="physical-save-confirmation"
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  sectionHeader: {
    fontFamily: typeScale.titleMedium.family,
    fontSize: typeScale.titleMedium.size,
    lineHeight: lineHeight(typeScale.titleMedium),
    color: colors.ink,
    marginBottom: spacing.elementGap,
  },
  energySection: {
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
});
