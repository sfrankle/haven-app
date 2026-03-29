import { StyleSheet } from 'react-native';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';

/**
 * Style blocks shared across log screens (Hydration, Activity, Food, etc.).
 * Import and spread into a screen's own StyleSheet.create() call, or reference directly.
 */
export const logScreenStyles = StyleSheet.create({
  screenContent: {
    flex: 1,
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.sectionGap,
  },
  prompt: {
    fontFamily: typeScale.titleLarge.family,
    fontWeight: typeScale.titleLarge.weight,
    fontSize: typeScale.titleLarge.size,
    lineHeight: lineHeight(typeScale.titleLarge),
    color: colors.ink,
    marginBottom: spacing.sectionGap,
  },
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
  saveErrorText: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.chrome,
    marginTop: spacing.elementGap,
  },
  promptPadded: {
    paddingHorizontal: spacing.pagePadding,
  },
});
