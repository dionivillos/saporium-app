import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { RecipeCard } from '@/components/recipe-card';
import { RecipeFilterBar } from '@/components/recipe-filter-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import {
  listUsedTags,
  NO_FILTERS,
  recipeListQuery,
  toListEntry,
  type RecipeFilters,
} from '@/db/recipes';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export default function RecipeListScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [filters, setFilters] = useState<RecipeFilters>(NO_FILTERS);
  const [tags, setTags] = useState<string[]>([]);

  // The input keeps every keystroke; only the query waits for the typing to settle.
  const search = useDebouncedValue(filters.search);
  const applied = useMemo<RecipeFilters>(() => ({ ...filters, search }), [filters, search]);

  const { data: rows } = useLiveQuery(recipeListQuery(db, applied), [
    applied.search,
    applied.difficulty,
    applied.tag,
  ]);

  const recipes = useMemo(() => rows.map(toListEntry), [rows]);

  useFocusEffect(
    useCallback(() => {
      setTags(listUsedTags(db));
    }, [])
  );

  const filtering =
    applied.search.trim().length > 0 || applied.difficulty !== null || applied.tag !== null;

  // Nothing to search in yet, so the filter bar would only be in the way.
  if (recipes.length === 0 && !filtering) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <View style={styles.empty}>
          <ThemedText type="subtitle" style={styles.centered}>
            {t('recipes.empty')}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            {t('recipes.emptyDescription')}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={recipes}
        keyExtractor={(recipe) => recipe.id}
        style={styles.scroll}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <RecipeFilterBar filters={filters} onChange={setFilters} tags={tags} />
        }
        ListEmptyComponent={
          <View style={styles.noResults}>
            <ThemedText themeColor="textSecondary" style={styles.centered}>
              {t('recipes.search.noResults')}
            </ThemedText>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <RecipeCard recipe={item} onPress={() => router.push(`/recipe/${item.id}`)} />
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Same reason as the detail's ScrollView: without flex the list grows past
  // the screen instead of scrolling inside it.
  scroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  separator: {
    height: Spacing.three,
  },
  noResults: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  emptyContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  centered: {
    textAlign: 'center',
  },
});
