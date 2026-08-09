import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { RecipeFilterSheet } from '@/components/recipe-filter-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { activeFilterCount, NO_FILTERS, type RecipeFilters } from '@/db/recipes';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
  /** Tags in use, so the sheet never offers a filter that matches nothing. */
  tags: string[];
};

/**
 * Search is always visible because it is what gets used; the rest lives behind
 * one button that says how many filters are on, and clears them all at once.
 */
export function RecipeFilterBar({ filters, onChange, tags }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);

  const active = activeFilterCount(filters);

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
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheetOpen(true)}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
              borderColor: active > 0 ? theme.text : 'transparent',
            },
          ]}
        >
          <ThemedText type="small">
            {active > 0
              ? t('recipes.search.filtersActive', { count: active })
              : t('recipes.search.filters')}
          </ThemedText>
        </Pressable>

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
        visible={sheetOpen}
        filters={filters}
        tags={tags}
        onChange={onChange}
        onClose={() => setSheetOpen(false)}
      />
    </View>
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
    gap: Spacing.three,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: 999,
    borderWidth: 1,
  },
});
