import React from 'react';
import { StyleSheet, ViewProps, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/constants/theme';

function BackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={styles.backButton}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <MaterialCommunityIcons name="chevron-left" size={28} color={colors.chrome} />
    </Pressable>
  );
}

interface ScreenProps extends ViewProps {
  children?: React.ReactNode;
  showBack?: boolean;
}

export function Screen({ children, style, showBack, ...props }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.safeArea, style]} {...props}>
      {showBack && <BackButton />}
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.tight,
    paddingBottom: spacing.micro,
  },
});
