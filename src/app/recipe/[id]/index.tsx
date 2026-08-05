import { Link, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { RecipeDetail } from '@/components/recipe-detail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { getRecipe, type RecipeWithDetails } from '@/db/recipes';

export default function RecipeDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<RecipeWithDetails | null>(null);

  // Re-read on focus so returning from the edit screen shows the saved recipe.
  useFocusEffect(
    useCallback(() => {
      setRecipe(getRecipe(db, id));
    }, [id])
  );

  if (recipe === null) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: '' }} />
        <ThemedText type="subtitle">{t('errors.recipeNotFound')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: recipe.title,
          headerRight: () => (
            <Link href={`/recipe/${id}/edit`} style={styles.headerLink}>
              {t('common.edit')}
            </Link>
          ),
        }}
      />
      <RecipeDetail recipe={recipe} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  headerLink: {
    fontSize: 17,
    color: '#0A7EA4',
  },
});
