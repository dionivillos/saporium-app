import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Rendered under the scrolling content, where a thumb can reach it. */
  footer?: ReactNode;
};

/** A panel from the bottom, dismissed by the backdrop or by its own close action. */
export function Sheet({ visible, title, onClose, children, footer }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />

      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{title}</ThemedText>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={Spacing.two}>
            <ThemedText type="smallBold" style={styles.action}>
              {t('common.close')}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>

        {footer}
      </View>
    </Modal>
  );
}

/** A pill that can be on or off, used for every choice inside a sheet. */
export function SheetOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected || pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: selected ? theme.text : 'transparent',
        },
      ]}
    >
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

export const sheetStyles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    maxHeight: '70%',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingBottom: Spacing.five,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.four,
  },
  option: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
  },
  action: {
    fontSize: 16,
    color: '#0A7EA4',
  },
});
