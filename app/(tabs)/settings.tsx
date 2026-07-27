import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Surface } from '@/components';
import { useFocuses } from '@/hooks/useFocuses';
import { useRoutines } from '@/hooks/useRoutines';
import { setFocusArchived, setRoutineArchived } from '@/lib/db/queries';
import { getTypedDb } from '@/lib/db/typed-db';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import type { Focus, Routine } from '@/lib/db/query-types';

const sectionLabelStyle = {
  fontFamily: typeScale.titleMedium.family,
  fontWeight: typeScale.titleMedium.weight,
  fontSize: typeScale.titleMedium.size,
  lineHeight: lineHeight(typeScale.titleMedium),
  color: colors.ink,
  marginBottom: spacing.elementGap,
} as const;

const focusNameStyle = {
  flex: 1,
  fontFamily: typeScale.bodyMedium.family,
  fontWeight: typeScale.bodyMedium.weight,
  fontSize: typeScale.bodyMedium.size,
  lineHeight: lineHeight(typeScale.bodyMedium),
  color: colors.ink,
} as const;

function SettingsFocusSection() {
  const router = useRouter();
  const { focuses: allFocuses } = useFocuses({ includeArchived: true });

  const [unarchiving, setUnarchiving] = useState<number | null>(null);
  // Local optimistic state: track IDs that have been unarchived in this session
  const [locallyUnarchived, setLocallyUnarchived] = useState<Set<number>>(new Set());

  const activeFocuses = allFocuses.filter((f) => !f.archived);
  const archivedFocuses = allFocuses.filter(
    (f) => f.archived && !locallyUnarchived.has(f.id)
  );

  async function handleUnarchive(focus: Focus) {
    setUnarchiving(focus.id);
    try {
      const db = await getTypedDb();
      await setFocusArchived(db, focus.id, false);
      setLocallyUnarchived((prev) => new Set([...prev, focus.id]));
    } catch {
      // unarchive failed — row remains visible; user can retry
    } finally {
      setUnarchiving(null);
    }
  }

  if (allFocuses.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={sectionLabelStyle}>Focus</Text>

      {activeFocuses.map((focus) => (
        <Surface
          key={focus.id}
          style={styles.focusRow}
          testID={`settings-focus-row-${focus.id}`}
        >
          <Text style={focusNameStyle}>{focus.name}</Text>
          <Pressable
            onPress={() => router.push(`/focus/${focus.id}/edit`)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${focus.name}`}
            testID={`settings-focus-edit-${focus.id}`}
            hitSlop={8}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </Pressable>
        </Surface>
      ))}

      {archivedFocuses.length > 0 && (
        <View style={styles.archivedGroup}>
          <Text style={[sectionLabelStyle, styles.archivedHeading]}>Archived</Text>
          {archivedFocuses.map((focus) => (
            <Surface
              key={focus.id}
              style={styles.focusRow}
              testID={`settings-focus-archived-row-${focus.id}`}
            >
              <Text style={focusNameStyle}>{focus.name}</Text>
              <Pressable
                onPress={() => { void handleUnarchive(focus); }}
                disabled={unarchiving === focus.id}
                accessibilityRole="button"
                accessibilityLabel={`Unarchive ${focus.name}`}
                testID={`settings-focus-unarchive-${focus.id}`}
                hitSlop={8}
              >
                <Text style={styles.interactiveLabel}>Unarchive</Text>
              </Pressable>
            </Surface>
          ))}
        </View>
      )}
    </View>
  );
}

function SettingsRoutinesSection() {
  const router = useRouter();
  const { routines: allRoutines } = useRoutines({ includeArchived: true });

  const [unarchiving, setUnarchiving] = useState<number | null>(null);
  // Local optimistic state: track IDs that have been unarchived in this session
  const [locallyUnarchived, setLocallyUnarchived] = useState<Set<number>>(new Set());

  const activeRoutines = allRoutines.filter((r) => !r.archived);
  const archivedRoutines = allRoutines.filter(
    (r) => r.archived && !locallyUnarchived.has(r.id)
  );

  async function handleUnarchive(routine: Routine) {
    setUnarchiving(routine.id);
    try {
      const db = await getTypedDb();
      await setRoutineArchived(db, routine.id, false);
      setLocallyUnarchived((prev) => new Set([...prev, routine.id]));
    } catch {
      // unarchive failed — row remains visible; user can retry
    } finally {
      setUnarchiving(null);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={sectionLabelStyle}>Routines</Text>

      {activeRoutines.map((routine) => (
        <Surface
          key={routine.id}
          style={styles.focusRow}
          testID={`settings-routine-row-${routine.id}`}
        >
          <Text style={focusNameStyle}>{routine.name}</Text>
          <Pressable
            onPress={() => router.push(`/routine/${routine.id}/edit`)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${routine.name}`}
            testID={`settings-routine-edit-${routine.id}`}
            hitSlop={8}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </Pressable>
        </Surface>
      ))}

      {archivedRoutines.length > 0 && (
        <View style={styles.archivedGroup}>
          <Text style={[sectionLabelStyle, styles.archivedHeading]}>Archived</Text>
          {archivedRoutines.map((routine) => (
            <Surface
              key={routine.id}
              style={styles.focusRow}
              testID={`settings-routine-archived-row-${routine.id}`}
            >
              <Text style={focusNameStyle}>{routine.name}</Text>
              <Pressable
                onPress={() => { void handleUnarchive(routine); }}
                disabled={unarchiving === routine.id}
                accessibilityRole="button"
                accessibilityLabel={`Unarchive ${routine.name}`}
                testID={`settings-routine-unarchive-${routine.id}`}
                hitSlop={8}
              >
                <Text style={styles.interactiveLabel}>Unarchive</Text>
              </Pressable>
            </Surface>
          ))}
        </View>
      )}

      {/* + Add Routine is always available — Settings is the canonical
          create-anytime surface for Routine management. */}
      <Surface style={styles.focusRow} testID="settings-routines-add-row">
        <Pressable
          onPress={() => router.push('/routine/create')}
          accessibilityRole="button"
          accessibilityLabel="Add Routine"
          testID="settings-routines-add-button"
        >
          <Text style={styles.interactiveLabel}>+ Add Routine</Text>
        </Pressable>
      </Surface>
    </View>
  );
}

export default function SettingsScreen() {
  return (
    <Screen>
      <View style={styles.section}>
        <Text style={sectionLabelStyle} testID="settings-section-privacy">Privacy</Text>
        <Surface style={styles.focusRow}>
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.lockIcon}
          >🔒</Text>
          <Text
            testID="privacy-notice"
            style={focusNameStyle}
          >
            Your data is stored only on this device.
          </Text>
        </Surface>
      </View>

      <View style={styles.sectionDivider} testID="settings-section-divider" />

      <SettingsFocusSection />

      <View style={styles.sectionDivider} testID="settings-routines-divider" />

      <SettingsRoutinesSection />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.sectionGap,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.chrome,
    opacity: 0.15,
    marginHorizontal: spacing.pagePadding,
    marginTop: spacing.sectionGap,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.elementGap,
  },
  settingsIcon: {
    fontSize: 18,
    color: colors.chrome,
  },
  archivedGroup: {
    marginTop: spacing.elementGap,
  },
  archivedHeading: {
    marginTop: spacing.elementGap,
  },
  interactiveLabel: {
    fontFamily: typeScale.labelMedium.family,
    fontSize: typeScale.labelMedium.size,
    lineHeight: lineHeight(typeScale.labelMedium),
    color: colors.interactive,
  },
  lockIcon: {
    fontSize: typeScale.bodyMedium.size,
  },
});
