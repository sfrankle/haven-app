import React, { useState, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { useFocuses } from '@/hooks/useFocuses';
import { createFocus } from '@/lib/db/queries';
import { getDb } from '@/lib/db/database';
import { colors, spacing, typeScale, lineHeight } from '@/constants/theme';
import { messages } from '@/constants/messages';
import { SaveErrorMessage } from '@/components/SaveErrorMessage';
import type { Db } from '@/lib/db/queries';

interface FocusDropdownProps {
  selectedId: number | undefined;
  onSelect: (id: number | undefined) => void;
  defaultExpanded?: boolean;
  testID?: string;
  /** Optional style applied to the root View. Use to add padding on screens
   *  that don't provide their own horizontal padding (e.g. emotion tier2/3). */
  style?: ViewStyle;
}

export function FocusDropdown({
  selectedId,
  onSelect,
  defaultExpanded,
  testID,
  style,
}: FocusDropdownProps) {
  const { focuses } = useFocuses();
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  function handleToggle() {
    setExpanded((prev) => !prev);
  }

  function handleSelectOption(id: number) {
    if (id === selectedId) {
      onSelect(undefined);
    } else {
      onSelect(id);
    }
  }

  function handleOpenModal() {
    setNewName('');
    setErrorMessage('');
    setModalVisible(true);
  }

  function handleCancel() {
    setErrorMessage('');
    setModalVisible(false);
  }

  function handleNameChange(text: string) {
    setNewName(text);
    setErrorMessage('');
  }

  async function handleSubmit() {
    const trimmed = newName.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const db = (await getDb()) as unknown as Db;
      const focus = await createFocus(db, { name: trimmed });
      onSelect(focus.id);
      setModalVisible(false);
      setNewName('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('UNIQUE')) {
        setErrorMessage(messages.focusDuplicateName);
      } else {
        setErrorMessage(messages.focusCreateError);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const toggleLabel = useMemo(
    () => selectedId !== undefined
      ? (focuses.find((f) => f.id === selectedId)?.name ?? '+ Focus')
      : '+ Focus',
    [focuses, selectedId],
  );

  return (
    <View testID={testID} style={style}>
      <Pressable
        testID="focus-toggle"
        onPress={handleToggle}
        style={styles.toggle}
        accessibilityRole="button"
      >
        <Text style={[styles.toggleText, selectedId !== undefined && styles.toggleSelected]}>
          {toggleLabel}
        </Text>
      </Pressable>

      {expanded && (
        <View style={styles.list}>
          {focuses.map((focus) => (
            <Pressable
              key={focus.id}
              testID={`focus-option-${focus.id}`}
              onPress={() => handleSelectOption(focus.id)}
              style={styles.option}
              accessibilityRole="button"
            >
              <Text style={[
                styles.optionText,
                focus.id === selectedId && styles.optionSelected,
              ]}>
                {focus.name}
              </Text>
            </Pressable>
          ))}
          <Pressable
            testID="focus-new"
            onPress={handleOpenModal}
            style={styles.option}
            accessibilityRole="button"
          >
            <Text style={styles.newFocusText}>+ New Focus</Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
        testID="focus-new-modal"
      >
        <View style={styles.modalOverlay}>
          {/* KeyboardAvoidingView prevents the keyboard from covering the
              name input on iOS. Android modals handle this automatically. */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            testID="focus-modal-kav"
          >
            <View style={styles.modalSheet}>
              {/* NOTE: This modal is intentionally name-only — it creates a bare
                  Focus and immediately selects it. Associating labels here was
                  aspirational (issue #114) but the current name-only flow is the
                  accepted design. Labels are associated on the Focus edit screen. */}
              <TextInput
                testID="focus-new-name-input"
                style={styles.modalInput}
                value={newName}
                onChangeText={handleNameChange}
                placeholder="Focus name"
                placeholderTextColor={colors.chrome}
                autoFocus
              />
              <SaveErrorMessage
                visible={errorMessage !== ''}
                message={errorMessage}
                testID="focus-error-message"
              />
              <View style={styles.modalButtons}>
                <Pressable
                  testID="focus-new-cancel"
                  onPress={handleCancel}
                  style={styles.modalBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  testID="focus-new-submit"
                  onPress={() => { void handleSubmit(); }}
                  style={styles.modalBtn}
                  accessibilityRole="button"
                  disabled={submitting}
                >
                  <Text style={styles.submitText}>Add</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    paddingVertical: spacing.elementGap / 2,
  },
  toggleText: {
    fontFamily: typeScale.labelLarge.family,
    fontSize: typeScale.labelLarge.size,
    lineHeight: lineHeight(typeScale.labelLarge),
    color: colors.chrome,
  },
  toggleSelected: {
    color: colors.ink,
    fontFamily: typeScale.labelLarge.family,
  },
  list: {
    marginTop: spacing.elementGap / 2,
  },
  option: {
    paddingVertical: spacing.elementGap / 2,
  },
  optionText: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
  },
  optionSelected: {
    fontFamily: typeScale.labelLarge.family,
    color: colors.glow,
  },
  newFocusText: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.chrome,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    padding: spacing.pagePadding,
    paddingBottom: spacing.pagePadding * 2,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalInput: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
    color: colors.ink,
    borderBottomWidth: 1,
    borderColor: colors.chrome,
    paddingVertical: spacing.elementGap / 2,
    marginBottom: spacing.sectionGap,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sectionGap,
  },
  modalBtn: {
    paddingVertical: spacing.elementGap / 2,
  },
  cancelText: {
    fontFamily: typeScale.labelLarge.family,
    fontSize: typeScale.labelLarge.size,
    lineHeight: lineHeight(typeScale.labelLarge),
    color: colors.chrome,
  },
  submitText: {
    fontFamily: typeScale.labelLarge.family,
    fontSize: typeScale.labelLarge.size,
    lineHeight: lineHeight(typeScale.labelLarge),
    color: colors.interactive,
  },
});
