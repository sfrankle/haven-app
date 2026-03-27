import React from 'react';
import { StyleSheet, ViewProps, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/constants/theme';

interface ScreenProps extends ViewProps {
  children?: React.ReactNode;
  showBack?: boolean;
}

export function Screen({ children, style, showBack, ...props }: ScreenProps) {
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safeArea, style]} {...props}>
      {showBack && (
        <View style={styles.backRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons name="chevron-left" size={28} color={colors.chrome} />
          </Pressable>
        </View>
      )}
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backRow: {
    paddingHorizontal: spacing.pagePadding,
    paddingTop: 8,
    paddingBottom: 4,
  },
});
