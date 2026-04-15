import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Surface } from '@/components';
import { useFocuses } from '@/hooks/useFocuses';
import { setFocusArchived } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';
import type { Db } from '@/lib/db/queries';
import type { Focus } from '@/lib/db/query-types';

const sectionLabelStyle = {
  fontFamily: typeScale.labelMedium.family,
  fontWeight: typeScale.labelMedium.weight,
  fontSize: typeScale.labelMedium.size,
  lineHeight: lineHeight(typeScale.labelMedium),
  color: colors.chrome,
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
      const db = (await getDb()) as unknown as Db;
      await setFocusArchived(db, focus.id, false);
      setLocallyUnarchived((prev) => new Set([...prev, focus.id]));
    } finally {
      setUnarchiving(null);
    }
  }

  return (
    <View style={{ paddingHorizontal: spacing.pagePadding, paddingTop: spacing.sectionGap }}>
      <Text style={sectionLabelStyle}>Focus</Text>

      {activeFocuses.map((focus) => (
        <Surface
          key={focus.id}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.elementGap }}
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
            <Text style={{ fontSize: 18, color: colors.chrome }}>⚙</Text>
          </Pressable>
        </Surface>
      ))}

      {archivedFocuses.length > 0 && (
        <View style={{ marginTop: spacing.elementGap }}>
          <Text style={[sectionLabelStyle, { marginTop: spacing.elementGap }]}>Archived</Text>
          {archivedFocuses.map((focus) => (
            <Surface
              key={focus.id}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.elementGap }}
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
                <Text
                  style={{
                    fontFamily: typeScale.labelMedium.family,
                    fontSize: typeScale.labelMedium.size,
                    lineHeight: lineHeight(typeScale.labelMedium),
                    color: colors.interactive,
                  }}
                >
                  Unarchive
                </Text>
              </Pressable>
            </Surface>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  return (
    <Screen>
      <View style={{ paddingHorizontal: spacing.pagePadding, paddingTop: spacing.sectionGap }}>
        <Text style={sectionLabelStyle}>Privacy</Text>
        <Surface style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ fontSize: typeScale.bodyMedium.size }}
          >🔒</Text>
          <Text
            testID="privacy-notice"
            style={{
              flex: 1,
              fontFamily: typeScale.bodyMedium.family,
              fontWeight: typeScale.bodyMedium.weight,
              fontSize: typeScale.bodyMedium.size,
              lineHeight: lineHeight(typeScale.bodyMedium),
              color: colors.ink,
            }}
          >
            Your data is stored only on this device.
          </Text>
        </Surface>
      </View>

      <SettingsFocusSection />
    </Screen>
  );
}
