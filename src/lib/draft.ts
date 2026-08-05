import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RecipeFormValues } from '@/components/recipe-form';

// A half-typed recipe is the user's work. It lives outside the database until
// they submit, so it is kept here rather than as a draft row: nothing
// unfinished should ever show up in the collection or in a backup.

const PREFIX = 'saporium.draft.';

export function draftKey(recipeId?: string): string {
  return `${PREFIX}${recipeId ?? 'new'}`;
}

export async function saveDraft(key: string, values: RecipeFormValues): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Losing a draft is bad but must never break typing.
  }
}

export async function loadDraft(key: string): Promise<RecipeFormValues | null> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored === null ? null : (JSON.parse(stored) as RecipeFormValues);
  } catch {
    return null;
  }
}

export async function clearDraft(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Nothing useful to do; a stale draft is offered, not forced.
  }
}
