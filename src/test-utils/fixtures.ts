import type { RecipeWithDetails } from '@/db/recipes';
import type { Recipe } from '@/db/schema';

export function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1',
    title: 'Tortilla de patatas',
    description: null,
    difficulty: null,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    totalTimeMinutes: null,
    servingsMin: 1,
    servingsMax: null,
    tips: null,
    coverImagePath: null,
    sourceUrl: null,
    language: 'es',
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function makeRecipeWithDetails(
  overrides: Partial<RecipeWithDetails> = {}
): RecipeWithDetails {
  return {
    ...makeRecipe(overrides),
    ingredients: [
      {
        id: 'ingredient-1',
        recipeId: 'recipe-1',
        position: 0,
        name: 'Patatas',
        quantity: '500',
        unit: 'g',
        rawText: '500 g de patatas',
        groupName: null,
      },
    ],
    steps: [
      {
        id: 'step-1',
        recipeId: 'recipe-1',
        position: 0,
        content: 'Pelar y cortar las patatas.',
        imagePath: null,
      },
    ],
    tags: [],
    ...overrides,
  };
}
