import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';

interface SaveConfirmationProps {
  visible: boolean;
  message?: string;
  duration?: number;
  onDismiss?: () => void;
  testID?: string;
}

export function SaveConfirmation({
  visible,
  message = 'Entry saved.',
  duration = 1500,
  onDismiss,
  testID,
}: SaveConfirmationProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  // Keep a ref so the animation callback always calls the latest onDismiss
  // without needing to restart the animation when the prop identity changes.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!visible) return;

    // Cancel any in-progress animation before starting a new one
    if (animationRef.current) {
      animationRef.current.stop();
    }
    opacity.setValue(0);

    const sequence = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]);

    animationRef.current = sequence;
    sequence.start(({ finished }) => {
      if (finished && onDismissRef.current) {
        onDismissRef.current();
      }
    });

    return () => {
      sequence.stop();
    };
  }, [visible, duration, opacity]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.container, { opacity }]}
      pointerEvents="none"
      testID={testID}
    >
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // 56 = approximate height of the submit button that sits above the nav bar
    bottom: spacing.navBottomPadding + 56,
    alignSelf: 'center',
    backgroundColor: `rgba(47,111,98,0.12)`,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  message: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
  },
});
