/** Minutes split into whole hours and the remainder, for display. */
export function splitDuration(totalMinutes: number): { hours: number; minutes: number } {
  const safe = Math.max(0, Math.round(totalMinutes));

  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

type TimedRecipe = {
  totalTimeMinutes: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
};

/**
 * The time to show on a card or header: an explicit total when the recipe has
 * one, otherwise prep and cook added up. Null when nothing was filled in.
 */
export function effectiveTotalMinutes(recipe: TimedRecipe): number | null {
  if (recipe.totalTimeMinutes !== null) return recipe.totalTimeMinutes;

  const parts = [recipe.prepTimeMinutes, recipe.cookTimeMinutes].filter(
    (value): value is number => value !== null
  );

  return parts.length > 0 ? parts.reduce((sum, value) => sum + value, 0) : null;
}
