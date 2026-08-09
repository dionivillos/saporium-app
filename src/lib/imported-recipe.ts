import { EMPTY_FORM, type RecipeFormValues } from '@/components/recipe-form';
import { ingredientsToText, numberToText, stepsToText, tagsToText } from '@/lib/recipe-text';
import type { CreateRecipeInput } from '@/validations/recipe';

/**
 * An imported recipe becomes form text, not a saved row: the user reviews and
 * submits it like anything they typed. `rawText` is what goes back on screen,
 * so the site's own wording survives the round trip.
 */
export function toFormValues(recipe: CreateRecipeInput, sourceUrl: string): RecipeFormValues {
  return {
    ...EMPTY_FORM,
    title: recipe.title,
    ingredients: ingredientsToText(recipe.ingredients),
    steps: stepsToText(recipe.steps),
    description: recipe.description ?? '',
    difficulty: recipe.difficulty ?? null,
    prepTime: numberToText(recipe.prepTimeMinutes ?? null),
    cookTime: numberToText(recipe.cookTimeMinutes ?? null),
    servingsMin: numberToText(recipe.servingsMin ?? null),
    servingsMax: numberToText(recipe.servingsMax ?? null),
    tips: recipe.tips ?? '',
    tags: tagsToText(recipe.tags ?? []),
    sourceUrl,
  };
}
