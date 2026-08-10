import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet } from 'react-native';

import { RecipeDetail } from '@/components/recipe-detail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { getRecipe, softDeleteRecipe, type RecipeWithDetails } from '@/db/recipes';
import { useTheme } from '@/hooks/use-theme';

export default function RecipeDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const [recipe, setRecipe] = useState<RecipeWithDetails | null>(null);

  function confirmDelete() {
    Alert.alert(t('recipes.delete.title'), t('recipes.delete.description'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('recipes.delete.confirm'),
        style: 'destructive',
        onPress: () => {
          softDeleteRecipe(db, id);
          router.back();
        },
      },
    ]);
  }

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
          // The hero already carries the title; repeating it in the bar is noise.
          title: '',
          headerRight: () => (
            <Link
              href={`/recipe/${id}/edit`}
              allowFontScaling={false}
              style={[styles.headerLink, { color: theme.link }]}
            >
              {t('common.edit')}
            </Link>
          ),
        }}
      />
      <RecipeDetail recipe={recipe} onDelete={confirmDelete} />
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
  },
});
