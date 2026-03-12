import { Text, View } from 'react-native';
import { Screen, Surface } from '@/components';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';

export default function SettingsScreen() {
  return (
    <Screen>
      <View style={{ paddingHorizontal: spacing.pagePadding, paddingTop: spacing.sectionGap }}>
        <Text
          style={{
            fontFamily: typeScale.labelMedium.family,
            fontWeight: typeScale.labelMedium.weight,
            fontSize: typeScale.labelMedium.size,
            lineHeight: lineHeight(typeScale.labelMedium),
            color: colors.chrome,
            marginBottom: spacing.elementGap,
          }}
        >
          Privacy
        </Text>
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
    </Screen>
  );
}
