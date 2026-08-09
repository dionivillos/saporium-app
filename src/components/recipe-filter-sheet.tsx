import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { NO_FILTERS, type RecipeFilters } from '@/db/recipes';
import type { Recipe } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

type Props = {
  visible: boolean;
  filters: RecipeFilters;
  tags: string[];
  onChange: (filters: RecipeFilters) => void;
  onClose: () => void;
};

/**
 * Filters live behind one button instead of in a rail of chips: the rail grew
 * with every tag, mixed two unrelated axes in one scrolling line, and had no
 * way to undo a session of tapping other than undoing each tap.
 */
export function RecipeFilterSheet({ visible, filters, tags, onChange, onClose }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  /** Picking the active value again clears just that row. */
  function toggleDifficulty(value: Recipe['difficulty']) {
    onChange({ ...filters, difficulty: filters.difficulty === value ? null : value });
  }

  function toggleTag(value: string) {
    onChange({ ...filters, tag: filters.tag === value ? null : value });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />

      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{t('recipes.search.filters')}</ThemedText>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={Spacing.two}>
            <ThemedText type="smallBold" style={styles.action}>
              {t('common.close')}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.group}>
            <ThemedText type="smallBold">{t('recipes.detail.difficulty')}</ThemedText>
            <View style={styles.options}>
              {DIFFICULTIES.map((difficulty) => (
                <Option
                  key={difficulty}
                  label={t(`recipes.difficulty.${difficulty}`)}
                  selected={filters.difficulty === difficulty}
                  onPress={() => toggleDifficulty(difficulty)}
                />
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <ThemedText type="smallBold">{t('recipes.detail.tags')}</ThemedText>
            {tags.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('recipes.search.noTags')}
              </ThemedText>
            ) : (
              <View style={styles.options}>
                {tags.map((tag) => (
                  <Option
                    key={tag}
                    label={`#${tag}`}
                    selected={filters.tag === tag}
                    onPress={() => toggleTag(tag)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          onPress={() => onChange({ ...NO_FILTERS, search: filters.search })}
          style={({ pressed }) => [
            styles.clear,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
          ]}
        >
          <ThemedText type="smallBold">{t('recipes.search.clear')}</ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
}

function Option({
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
  group: {
    gap: Spacing.two,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  option: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
  },
  clear: {
    marginHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  action: {
    fontSize: 16,
    color: '#0A7EA4',
  },
});
