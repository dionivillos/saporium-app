import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { RecipeListItem } from '@/components/recipe-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { recipeListQuery } from '@/db/recipes';
import { useTheme } from '@/hooks/use-theme';

export default function RecipeListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { data: recipes } = useLiveQuery(recipeListQuery(db));

  if (recipes.length === 0) {
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
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
        renderItem={({ item }) => (
          <RecipeListItem recipe={item} onPress={() => router.push(`/recipe/${item.id}`)} />
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingVertical: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.four,
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
