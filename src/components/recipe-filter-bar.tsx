import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { RecipeFilterSheet } from '@/components/recipe-filter-sheet';
import { RecipeSortSheet } from '@/components/recipe-sort-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  activeFilterCount,
  DEFAULT_SORT,
  NO_FILTERS,
  type RecipeFilters,
  type RecipeSort,
} from '@/db/recipes';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
  sort: RecipeSort;
  onSortChange: (sort: RecipeSort) => void;
  /** Tags in use, so the sheet never offers a filter that matches nothing. */
  tags: string[];
};

/**
 * Search is always visible because it is what gets used. Filtering and ordering
 * are two different questions, so they are two buttons, each labelled with what
 * it is currently doing.
 */
export function RecipeFilterBar({ filters, onChange, sort, onSortChange, tags }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [openSheet, setOpenSheet] = useState<'filters' | 'sort' | null>(null);

  const active = activeFilterCount(filters);
  const sorted = sort !== DEFAULT_SORT;

  return (
    <View style={styles.bar}>
      <TextInput
        accessibilityLabel={t('common.search')}
        value={filters.search}
        onChangeText={(search) => onChange({ ...filters, search })}
        placeholder={t('recipes.search.placeholder')}
        placeholderTextColor={theme.textSecondary}
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />

      <View style={styles.actions}>
        <Pill
          label={
            active > 0
              ? t('recipes.search.filtersActive', { count: active })
              : t('recipes.search.filters')
          }
          highlighted={active > 0}
          onPress={() => setOpenSheet('filters')}
        />

        <Pill
          label={sorted ? t(`recipes.sort.${sort}`) : t('recipes.sort.label')}
          highlighted={sorted}
          onPress={() => setOpenSheet('sort')}
        />

        {active > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => onChange({ ...NO_FILTERS, search: filters.search })}
            hitSlop={Spacing.two}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {t('recipes.search.clear')}
            </ThemedText>
          </Pressable>
        )}
      </View>

      <RecipeFilterSheet
        visible={openSheet === 'filters'}
        filters={filters}
        tags={tags}
        onChange={onChange}
        onClose={() => setOpenSheet(null)}
      />

      <RecipeSortSheet
        visible={openSheet === 'sort'}
        sort={sort}
        onChange={onSortChange}
        onClose={() => setOpenSheet(null)}
      />
    </View>
  );
}

function Pill({
  label,
  highlighted,
  onPress,
}: {
  label: string;
  highlighted: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: highlighted ? theme.text : 'transparent',
        },
      ]}
    >
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    fontSize: 16,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: 999,
    borderWidth: 1,
  },
});
