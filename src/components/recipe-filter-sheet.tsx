import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Sheet, SheetOption, sheetStyles } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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
    <Sheet
      visible={visible}
      title={t('recipes.search.filters')}
      onClose={onClose}
      footer={
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
      }
    >
      <View style={sheetStyles.group}>
        <ThemedText type="smallBold">{t('recipes.detail.difficulty')}</ThemedText>
        <View style={sheetStyles.options}>
          {DIFFICULTIES.map((difficulty) => (
            <SheetOption
              key={difficulty}
              label={t(`recipes.difficulty.${difficulty}`)}
              selected={filters.difficulty === difficulty}
              onPress={() => toggleDifficulty(difficulty)}
            />
          ))}
        </View>
      </View>

      <View style={sheetStyles.group}>
        <ThemedText type="smallBold">{t('recipes.detail.tags')}</ThemedText>
        {tags.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('recipes.search.noTags')}
          </ThemedText>
        ) : (
          <View style={sheetStyles.options}>
            {tags.map((tag) => (
              <SheetOption
                key={tag}
                label={`#${tag}`}
                selected={filters.tag === tag}
                onPress={() => toggleTag(tag)}
              />
            ))}
          </View>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  clear: {
    marginHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
});
