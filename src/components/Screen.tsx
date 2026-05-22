import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, ViewProps, Pressable } from 'react-native';
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
  avoidKeyboard?: boolean;
}

export function Screen({ children, style, showBack, avoidKeyboard, ...props }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.safeArea, style]} {...props}>
      {showBack && <BackButton />}
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {children}
        </KeyboardAvoidingView>
      ) : (
        children
      )}
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
  keyboardAvoid: {
    flex: 1,
  },
});
