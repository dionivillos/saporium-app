import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { RecipeForm, type RecipeFormValues } from '@/components/recipe-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { getRecipe, updateRecipe, type RecipeWithDetails } from '@/db/recipes';
import { ingredientsToText, numberToText, stepsToText, tagsToText } from '@/lib/recipe-text';
import { deletePhoto } from '@/lib/photos';
import type { CreateRecipeInput } from '@/validations/recipe';

function toFormValues(recipe: RecipeWithDetails): RecipeFormValues {
  return {
    title: recipe.title,
    ingredients: ingredientsToText(recipe.ingredients),
    steps: stepsToText(recipe.steps),
    description: recipe.description ?? '',
    difficulty: recipe.difficulty,
    prepTime: numberToText(recipe.prepTimeMinutes),
    cookTime: numberToText(recipe.cookTimeMinutes),
    servingsMin: numberToText(recipe.servingsMin),
    servingsMax: numberToText(recipe.servingsMax),
    tips: recipe.tips ?? '',
    tags: tagsToText(recipe.tags),
    coverImagePath: recipe.coverImagePath,
  };
}

export default function EditRecipeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = useMemo(() => getRecipe(db, id), [id]);

  function handleSubmit(input: CreateRecipeInput) {
    const previous = recipe?.coverImagePath ?? null;
    updateRecipe(db, id, input);

    // Only once the new path is saved, so a failure never strands the recipe
    // pointing at a file that is gone.
    if (previous !== null && previous !== input.coverImagePath) deletePhoto(previous);

    router.back();
  }

  if (recipe === null) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">{t('errors.recipeNotFound')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: t('recipes.edit') }} />
      <RecipeForm
        initialValues={toFormValues(recipe)}
        submitLabel={t('recipes.form.submitEdit')}
        onSubmit={handleSubmit}
      />
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
});
