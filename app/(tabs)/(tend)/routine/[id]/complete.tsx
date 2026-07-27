/**
 * Complete Routine Screen — lets a user execute a routine as a checklist.
 *
 * LOGFORMSHELL EXEMPTION:
 * This screen intentionally does NOT use LogFormShell. LogFormShell is designed
 * for single-entry-type logging with a per-entry FocusDropdown. The complete
 * screen is a batch operation across multiple entry types with a shared Notes
 * field and no per-entry focus picker. The in-flight guard (submitting state),
 * error display, and notes field are implemented inline here.
 *
 * On submit:
 *   1. INSERT routine_completion → capture completionId
 *   2. For each checked item → INSERT entry with routine_id + routine_completion_id,
 *      plus entry_label and entry_focus rows as needed.
 * All steps run in a single transaction via completeRoutine().
 *
 * Per-item prescribed detail is displayed as static text (non-editable).
 * It is NOT persisted to the entry — it is display metadata from the routine
 * definition. The shared Notes field value is stored on every entry row.
 */
import React, { useState, useEffect } from 'react';
import {
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
import { getRoutines, getRoutineItems, completeRoutine } from '@/lib/db/queries';
import { getTypedDb } from '@/lib/db/typed-db';
import { nowLocalIso } from '@/lib/utils/timestamp';
import { colors, spacing, typeScale, lineHeight } from '@/constants/theme';
import { logScreenStyles, routineStyles } from '@/constants/sharedStyles';
import type { Routine, RoutineItem } from '@/lib/db/query-types';

// ─── local types ─────────────────────────────────────────────────────────────

type ChecklistItemState = RoutineItem & {
  checked: boolean;
  expanded: boolean; // whether instruction note is visible
};

// ─── screen ──────────────────────────────────────────────────────────────────

export default function CompleteRoutineScreen() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const routineId = Number(idParam);

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [items, setItems] = useState<ChecklistItemState[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const db = await getTypedDb();
        const [routines, routineItems] = await Promise.all([
          getRoutines(db, { includeArchived: true }),
          getRoutineItems(db, routineId),
        ]);
        if (!isMounted) return;

        const found = routines.find((r) => r.id === routineId);
        if (found) {
          setRoutine(found);
          setItems(
            routineItems.map((item) => ({ ...item, checked: true, expanded: false }))
          );
        } else {
          setLoadError("Couldn't load routine. Go back and try again.");
        }
      } catch {
        if (isMounted) setLoadError("Couldn't load routine. Go back and try again.");
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, [routineId]);

  function toggleChecked(index: number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  }

  function toggleExpanded(index: number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, expanded: !item.expanded } : item))
    );
  }

  async function handleSubmit() {
    if (submitting || routine === null) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const db = await getTypedDb();
      const checkedItems = items
        .filter((item) => item.checked)
        .map((item) => ({ entryTypeId: item.entryTypeId, labelIds: item.labelIds }));

      await completeRoutine(db, {
        routineId,
        associatedFocusId: routine.associatedFocusId,
        checkedItems,
        notes: notes.trim() || null,
        timestamp: nowLocalIso(),
      });

      setSaved(true);
      setTimeout(() => router.back(), 800);
    } catch {
      setSubmitError("Couldn't save. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError !== null) {
    return (
      <Screen showBack>
        <Text style={logScreenStyles.saveErrorText} testID="routine-complete-load-error">
          {loadError}
        </Text>
        <View style={logScreenStyles.saveButton}>
          <Button label="Go back" onPress={() => router.back()} testID="routine-complete-go-back" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen showBack avoidKeyboard>
      <ScrollView contentContainerStyle={logScreenStyles.screenContent}>
        {routine && (
          <Text style={styles.routineName}>{routine.name}</Text>
        )}

        {items.map((item, index) => (
          <View key={item.id} style={routineStyles.itemCard}>
            {/* Item header row: checkbox, name, expand button */}
            <View style={styles.itemHeaderRow}>
              <Pressable
                onPress={() => toggleChecked(index)}
                testID={`routine-complete-item-${index}-checkbox`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.checked }}
                style={[styles.checkbox, item.checked && styles.checkboxChecked]}
              >
                {item.checked && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>

              <Text style={styles.itemName}>{item.name}</Text>

              {item.instructionNote != null && (
                <Pressable
                  onPress={() => toggleExpanded(index)}
                  testID={`routine-complete-item-${index}-expand-button`}
                  accessibilityRole="button"
                  accessibilityLabel={item.expanded ? 'Hide note' : 'Show note'}
                  style={styles.expandButton}
                >
                  <Text style={styles.expandIcon}>{item.expanded ? '▲' : '▼'}</Text>
                </Pressable>
              )}
            </View>

            {/* Prescribed detail — static display only, not editable */}
            {item.prescribedDetail != null && (
              <Text style={styles.prescribedDetail}>
                {item.prescribedDetail}
              </Text>
            )}

            {/* Instruction note — revealed on expand */}
            {item.expanded && item.instructionNote != null && (
              <Text
                style={styles.instructionNote}
                testID={`routine-complete-item-${index}-instruction-note`}
              >
                {item.instructionNote}
              </Text>
            )}
          </View>
        ))}

        <TextInput
          style={logScreenStyles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor={colors.chrome}
          multiline
          testID="routine-complete-notes-input"
        />

        {submitError !== null && (
          <Text style={logScreenStyles.saveErrorText} testID="routine-complete-submit-error">
            {submitError}
          </Text>
        )}

        {saved && (
          <Text style={styles.savedConfirmation} testID="routine-complete-saved">
            Saved.
          </Text>
        )}

        <View style={logScreenStyles.saveButton}>
          <Button
            label="Save"
            onPress={() => { void handleSubmit(); }}
            disabled={submitting || saved}
            testID="routine-complete-submit-button"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  routineName: {
    fontFamily: typeScale.titleLarge.family,
    fontWeight: typeScale.titleLarge.weight,
    fontSize: typeScale.titleLarge.size,
    lineHeight: lineHeight(typeScale.titleLarge),
    color: colors.ink,
    marginBottom: spacing.sectionGap,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.elementGap,
    marginBottom: spacing.micro,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.chrome,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  checkmark: {
    color: colors.surface,
    fontSize: 14,
    fontFamily: typeScale.bodyMedium.family,
  },
  itemName: {
    flex: 1,
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
  },
  expandButton: {
    padding: 18,
    flexShrink: 0,
  },
  expandIcon: {
    color: colors.chrome,
    fontSize: 12,
  },
  prescribedDetail: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.chrome,
    marginTop: 2,
    marginBottom: spacing.micro,
    marginLeft: 24 + spacing.elementGap, // indent to align under item name
  },
  instructionNote: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.chrome,
    fontStyle: 'italic',
    marginTop: spacing.micro,
    marginLeft: 24 + spacing.elementGap, // indent to align under item name
  },
  savedConfirmation: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.chrome,
    textAlign: 'center',
    marginTop: spacing.micro,
  },
});
