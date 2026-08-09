import type { RecipeFormValues } from '@/components/recipe-form';

/**
 * Carries an imported recipe from the import screen to the form.
 *
 * It is deliberately in memory and read once: an import is not the user's work
 * until they submit it, so it should not survive the app being killed the way a
 * typed draft does, and it must never overwrite a draft they left behind.
 */
let pending: RecipeFormValues | null = null;

export function setPendingImport(values: RecipeFormValues): void {
  pending = values;
}

export function takePendingImport(): RecipeFormValues | null {
  const values = pending;
  pending = null;
  return values;
}
