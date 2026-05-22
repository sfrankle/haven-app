/**
 * Focus Quick-Log Screen
 *
 * NOTE: LogFormShell exemption
 * The 2026-04-10 architecture decision requires all new log screen types to use
 * LogFormShell. This screen is explicitly exempt because its interaction model is
 * fundamentally different: it presents a pre-populated checklist of items from a
 * single focus rather than a per-entry-type form. It has no Notes field, no
 * FocusDropdown (the Focus is the screen's subject, not a field), and submits
 * multiple entries in a batch. Adding LogFormShell here would add irrelevant UI
 * (Notes input, FocusDropdown) and would not reduce meaningful duplication since
 * this is the only screen of its kind.
 *
 * The submit-disappears-when-nothing-checked convention from interaction.md is
 * honoured (the Submit button renders only when at least one item is checked).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { SaveErrorMessage } from '@/components/SaveErrorMessage';
import { SeverityRow } from '@/components/SeverityRow';
import { getFocusById, getFocusItems, saveEntryBatch } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { nowLocalIso } from '@/lib/utils/timestamp';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import { logScreenStyles } from '@/constants/sharedStyles';
import type { Db } from '@/lib/db/queries';
import type { FocusItem } from '@/lib/db/query-types';

interface ItemState {
  checked: boolean;
  severity: number | null;
}

/**
 * Detects whether a row needs a severity selector.
 *
 * We use entryTypeName === 'Physical' (the stable internal name from the
 * entry_type seed) rather than looking up measurementType. This is consistent
 * with how the Physical log screen identifies itself. See docs/decisions.md
 * (2026-04-16, isPhysical coupling) for the accepted risk and guidance.
 */
function isPhysical(item: FocusItem): boolean {
  return item.entryTypeName === 'Physical';
}

export default function QuickLogScreen() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const focusId = Number(idParam);

  const [focusName, setFocusName] = useState<string>('');
  const [items, setItems] = useState<FocusItem[]>([]);
  const [itemState, setItemState] = useState<Map<number, ItemState>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const db = (await getDb()) as unknown as Db;
        const [focus, focusItems] = await Promise.all([
          getFocusById(db, focusId),
          getFocusItems(db, focusId),
        ]);
        if (!isMounted) return;

        if (focus) setFocusName(focus.name);

        setItems(focusItems);
        const initialState = new Map<number, ItemState>();
        for (const item of focusItems) {
          initialState.set(item.labelId, { checked: true, severity: null });
        }
        setItemState(initialState);
      } catch {
        // load errors are non-fatal; screen renders with empty list
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void load();
    return () => { isMounted = false; };
  }, [focusId]);

  function toggleItem(labelId: number) {
    setItemState((prev) => {
      const next = new Map(prev);
      const current = next.get(labelId);
      if (current) {
        next.set(labelId, { ...current, checked: !current.checked });
      }
      return next;
    });
  }

  function setSeverity(labelId: number, value: number) {
    setItemState((prev) => {
      const next = new Map(prev);
      const current = next.get(labelId);
      if (current) {
        // Tapping the already-selected severity clears it
        const newSeverity = current.severity === value ? null : value;
        next.set(labelId, { ...current, severity: newSeverity });
      }
      return next;
    });
  }

  const pinnedItems = useMemo(() => items.filter((i) => i.source === 'pinned'), [items]);
  const historicalItems = useMemo(() => items.filter((i) => i.source === 'historical'), [items]);
  const checkedItems = useMemo(
    () => items.filter((item) => itemState.get(item.labelId)?.checked === true),
    [items, itemState]
  );
  const canSubmit = checkedItems.length > 0;

  async function handleSubmit() {
    if (saving || !canSubmit) return;
    setSaving(true);
    setSaveError(false);
    try {
      const db = (await getDb()) as unknown as Db;
      const timestamp = nowLocalIso();
      const inputs = checkedItems.map((item) => {
        const state = itemState.get(item.labelId);
        return {
          entryTypeId: item.entryTypeId,
          timestamp,
          labelIds: [item.labelId],
          focusId,
          ...(state?.severity != null ? { numericValue: state.severity } : {}),
        };
      });
      await saveEntryBatch(db, inputs);
      router.back();
    } catch {
      setSaveError(true);
      setSaving(false);
    }
  }

  if (loading) {
    return <Screen showBack />;
  }

  return (
    <Screen showBack>
      <ScrollView contentContainerStyle={styles.content}>
        {focusName ? <Text style={logScreenStyles.prompt}>{focusName}</Text> : null}

        {items.length === 0 ? (
          <View testID="empty-state">
            <Text style={styles.emptyText}>
              Nothing pinned to this Focus yet.
            </Text>
            <Pressable
              onPress={() => router.replace(`/focus/${focusId}/edit` as never)}
              testID="empty-edit-link"
            >
              <Text style={styles.editLink}>Edit Focus</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {pinnedItems.length > 0 && (
              <View>
                <Text style={styles.sectionHeading} testID="section-heading-pinned">
                  Pinned
                </Text>
                {pinnedItems.map((item) => (
                  <ItemRow
                    key={item.labelId}
                    item={item}
                    state={itemState.get(item.labelId) ?? { checked: false, severity: null }}
                    onToggle={() => toggleItem(item.labelId)}
                    onSeverity={(v) => setSeverity(item.labelId, v)}
                  />
                ))}
              </View>
            )}

            {historicalItems.length > 0 && (
              <View style={styles.historicalSection}>
                <Text style={styles.sectionHeading} testID="section-heading-historical">
                  Noticed in past entries
                </Text>
                {historicalItems.map((item) => (
                  <ItemRow
                    key={item.labelId}
                    item={item}
                    state={itemState.get(item.labelId) ?? { checked: false, severity: null }}
                    onToggle={() => toggleItem(item.labelId)}
                    onSeverity={(v) => setSeverity(item.labelId, v)}
                  />
                ))}
              </View>
            )}

            <SaveErrorMessage visible={saveError} testID="save-error" />

            {canSubmit && (
              <View style={logScreenStyles.saveButton}>
                <Button
                  label="Save"
                  onPress={() => { void handleSubmit(); }}
                  disabled={saving}
                  testID="submit-button"
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

// ─── ItemRow component ────────────────────────────────────────────────────────

interface ItemRowProps {
  item: FocusItem;
  state: ItemState;
  onToggle: () => void;
  onSeverity: (value: number) => void;
}

function ItemRow({ item, state, onToggle, onSeverity }: ItemRowProps) {
  const displayText = `${item.entryTypeTitle}: ${item.labelName}`;
  return (
    <View style={styles.row} testID={`item-row-${item.labelId}`}>
      <Pressable
        style={styles.checkboxArea}
        onPress={onToggle}
        testID={`item-checkbox-${item.labelId}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: state.checked }}
      >
        <View style={[styles.checkbox, state.checked && styles.checkboxChecked]}>
          {state.checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[styles.rowLabel, !state.checked && styles.rowLabelUnchecked]}>
          {displayText}
        </Text>
      </Pressable>

      {isPhysical(item) && state.checked && (
        <View style={styles.severityRow}>
          {/* SeverityRow includes 0 (absent) through 5. onDismiss is a no-op
              because severity stays visible while the item is checked — there
              is no auto-dismiss concept on this screen. The toggle-clear logic
              lives in setSeverity above. */}
          <SeverityRow
            value={state.severity}
            onChange={(v) => onSeverity(v)}
            onDismiss={() => { /* no-op */ }}
            testID={`severity-row-${item.labelId}`}
          />
        </View>
      )}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.sectionGap,
    paddingBottom: spacing.sectionGap,
  },
  sectionHeading: {
    fontFamily: typeScale.labelMedium.family,
    fontWeight: typeScale.labelMedium.weight,
    fontSize: typeScale.labelMedium.size,
    lineHeight: lineHeight(typeScale.labelMedium),
    color: colors.chrome,
    marginBottom: spacing.elementGap,
    marginTop: spacing.elementGap,
  },
  historicalSection: {
    marginTop: spacing.sectionGap,
  },
  row: {
    marginBottom: spacing.elementGap,
  },
  checkboxArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.elementGap,
    paddingVertical: spacing.tight,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.chrome,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.interactive,
    borderColor: colors.interactive,
  },
  checkmark: {
    color: colors.background,
    fontSize: 13,
    lineHeight: 16,
  },
  rowLabel: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
    flex: 1,
  },
  rowLabelUnchecked: {
    color: colors.chrome,
  },
  severityRow: {
    marginTop: spacing.micro,
    marginLeft: 22 + spacing.elementGap,
  },
  emptyText: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.chrome,
    marginBottom: spacing.elementGap,
  },
  editLink: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.interactive,
  },
});
