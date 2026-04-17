import React, { memo } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../utils/theme';

/**
 * iOS-style bottom action sheet.
 *
 * Usage:
 *   <ActionSheet
 *     visible={open}
 *     onClose={() => setOpen(false)}
 *     title="Chat"
 *     actions={[
 *       { icon: 'person', label: 'View Profile', onPress: ... },
 *       { icon: 'trash',  label: 'Clear Chat',   destructive: true, onPress: ... },
 *     ]}
 *   />
 */
function ActionSheet({ visible, onClose, title, actions = [] }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
          {title && (
            <View style={s.titleWrap}>
              <Text style={s.title}>{title}</Text>
            </View>
          )}
          <View style={s.group}>
            {actions.map((a, idx) => (
              <View key={a.label}>
                <Pressable
                  onPress={() => {
                    onClose();
                    setTimeout(() => a.onPress?.(), 100);
                  }}
                  style={({ pressed }) => [s.row, pressed && s.pressed]}
                >
                  {a.icon && (
                    <Ionicons
                      name={a.icon}
                      size={22}
                      color={a.destructive ? theme.colors.error : theme.colors.primary}
                      style={{ marginRight: 12 }}
                    />
                  )}
                  <Text style={[s.rowLabel, a.destructive && { color: theme.colors.error }]}>
                    {a.label}
                  </Text>
                </Pressable>
                {idx < actions.length - 1 && <View style={s.divider} />}
              </View>
            ))}
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [s.cancelBtn, pressed && s.pressed]}
          >
            <Text style={s.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: t.colors.overlay,
  },
  sheet: {
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  titleWrap: {
    backgroundColor: t.colors.surface,
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.hairline,
  },
  title: {
    fontFamily: t.typography.fontRegular,
    fontSize: 13, color: t.colors.textMuted,
  },
  group: {
    backgroundColor: t.colors.surface,
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: t.colors.surface,
  },
  pressed: { backgroundColor: t.colors.surfaceMuted },
  rowLabel: {
    fontFamily: t.typography.fontRegular,
    fontSize: 17, color: t.colors.text,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16, backgroundColor: t.colors.hairline },

  cancelBtn: {
    backgroundColor: t.colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: 17, color: t.colors.primary,
  },
});

export default memo(ActionSheet);
