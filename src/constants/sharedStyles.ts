import { StyleSheet } from 'react-native';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';

/**
 * Style blocks shared across log screens (Hydration, Activity, Food, etc.).
 * Import and spread into a screen's own StyleSheet.create() call, or reference directly.
 */
export const logScreenStyles = StyleSheet.create({
  notesInput: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.chrome,
    paddingVertical: spacing.elementGap,
    marginTop: spacing.sectionGap,
    marginBottom: spacing.sectionGap,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: spacing.elementGap,
  },
});
