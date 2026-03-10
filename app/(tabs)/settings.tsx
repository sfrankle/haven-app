import { Text, View } from 'react-native';
import { Screen } from '@/components';
import { colors, spacing, typeScale } from '@/constants/theme';

export default function SettingsScreen() {
  return (
    <Screen>
      <View style={{ paddingHorizontal: spacing.pagePadding }}>
        <Text
          testID="privacy-notice"
          style={{
            fontFamily: typeScale.bodyMedium.family,
            fontWeight: typeScale.bodyMedium.weight,
            fontSize: typeScale.bodyMedium.size,
            lineHeight: typeScale.bodyMedium.size * typeScale.bodyMedium.lineHeightMultiplier,
            color: colors.chrome,
          }}
        >
          Your data is stored only on this device.
        </Text>
      </View>
    </Screen>
  );
}
