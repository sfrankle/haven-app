import { StyleSheet } from 'react-native';
import { colors, lineHeight, spacing, typeScale } from '@/constants/theme';

export const routineStyles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  nameInput: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.chrome,
    paddingVertical: spacing.elementGap,
    marginBottom: spacing.sectionGap,
  },
  sectionLabel: {
    fontFamily: typeScale.labelMedium.family,
    fontWeight: typeScale.labelMedium.weight,
    fontSize: typeScale.labelMedium.size,
    lineHeight: lineHeight(typeScale.labelMedium),
    color: colors.chrome,
    marginTop: spacing.sectionGap,
    marginBottom: spacing.elementGap,
  },
  timeBlockRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.elementGap,
    marginBottom: spacing.sectionGap,
  },
  blockChip: {
    paddingHorizontal: spacing.elementGap,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.chrome,
    backgroundColor: colors.surface,
  },
  blockChipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  blockChipText: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.ink,
  },
  blockChipTextSelected: {
    color: colors.surface,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.chrome,
    borderRadius: 8,
    padding: spacing.elementGap,
    marginBottom: spacing.elementGap,
    backgroundColor: colors.surface,
  },
  entryTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.elementGap,
    marginBottom: spacing.elementGap,
  },
  detailInput: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.chrome,
    paddingVertical: 4,
    marginBottom: spacing.elementGap,
  },
  addItemButton: {
    paddingVertical: spacing.elementGap,
    alignItems: 'center',
    marginBottom: spacing.sectionGap,
  },
  addItemText: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
  },
});

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
    color: colors.error,
    marginTop: spacing.elementGap,
  },
  promptPadded: {
    paddingHorizontal: spacing.pagePadding,
  },
});
