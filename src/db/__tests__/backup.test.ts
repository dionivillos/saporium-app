import type { Database } from '@/db/client';
import { exportRecipes, importRecipes } from '@/db/backup';
import { createRecipe, getRecipe, listRecipes, softDeleteRecipe } from '@/db/recipes';
import { createTestDatabase } from '@/test-utils/db';
import type { CreateRecipeInput } from '@/validations/recipe';

const tortilla: CreateRecipeInput = {
  title: 'Tortilla de patatas',
  description: 'La de siempre',
  difficulty: 'easy',
  prepTimeMinutes: 15,
  cookTimeMinutes: 25,
  servingsMin: 4,
  tips: 'Deja reposar la patata',
  ingredients: [
    { name: 'Patatas', quantity: '500', unit: 'g', rawText: '500 g de patatas' },
    { name: 'Huevos', rawText: '4 huevos' },
  ],
  steps: [{ content: 'Pela las patatas.' }, { content: 'Cuaja la tortilla.' }],
  tags: ['cena', 'española'],
};

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

describe('exportRecipes', () => {
  it('produces a JSON array of schema.org recipes', () => {
    createRecipe(db, tortilla);

    const parsed = JSON.parse(exportRecipes(db));

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: 'Tortilla de patatas',
      prepTime: 'PT15M',
      recipeYield: '4',
    });
  });

  it('leaves trashed recipes out', () => {
    const id = createRecipe(db, tortilla);
    createRecipe(db, { ...tortilla, title: 'Otra' });

    softDeleteRecipe(db, id);

    expect(JSON.parse(exportRecipes(db))).toHaveLength(1);
  });

  it('exports an empty array for an empty collection', () => {
    expect(JSON.parse(exportRecipes(db))).toEqual([]);
  });
});

describe('importRecipes', () => {
  it('round-trips a whole collection through export and import', () => {
    createRecipe(db, tortilla);
    const json = exportRecipes(db);

    const fresh = createTestDatabase();
    const summary = importRecipes(fresh, json);
    const restored = getRecipe(fresh, listRecipes(fresh)[0]!.id);

    expect(summary).toEqual({ imported: 1, skipped: 0 });
    expect(restored).toMatchObject({
      title: 'Tortilla de patatas',
      description: 'La de siempre',
      difficulty: 'easy',
      prepTimeMinutes: 15,
      cookTimeMinutes: 25,
      servingsMin: 4,
      tips: 'Deja reposar la patata',
      tags: ['cena', 'española'],
    });
    expect(restored?.ingredients.map((i) => i.rawText)).toEqual(['500 g de patatas', '4 huevos']);
    expect(restored?.steps.map((s) => s.content)).toEqual([
      'Pela las patatas.',
      'Cuaja la tortilla.',
    ]);
  });

  it('adds to the collection instead of replacing it', () => {
    createRecipe(db, tortilla);
    const json = exportRecipes(db);

    importRecipes(db, json);

    expect(listRecipes(db)).toHaveLength(2);
  });

  it('imports a document from another app, with @graph and string instructions', () => {
    const foreign = JSON.stringify({
      '@graph': [
        { '@type': 'WebSite', name: 'Un blog' },
        {
          '@type': 'Recipe',
          name: 'Gazpacho',
          recipeIngredient: ['1 kg de tomates', '1 pepino'],
          recipeInstructions: 'Tritura todo.\nCuela y enfría.',
          recipeYield: '4 raciones',
          totalTime: 'PT20M',
        },
      ],
    });

    const summary = importRecipes(db, foreign);
    const restored = getRecipe(db, listRecipes(db)[0]!.id);

    expect(summary.imported).toBe(1);
    expect(restored?.title).toBe('Gazpacho');
    expect(restored?.totalTimeMinutes).toBe(20);
    expect(restored?.steps).toHaveLength(2);
  });

  it('counts unusable entries as skipped rather than dropping them silently', () => {
    const mixed = JSON.stringify([
      {
        '@type': 'Recipe',
        name: 'Buena',
        recipeIngredient: ['agua'],
        recipeInstructions: ['hervir'],
      },
      { '@type': 'Recipe', name: 'Sin pasos', recipeIngredient: ['agua'] },
    ]);

    expect(importRecipes(db, mixed)).toEqual({ imported: 1, skipped: 1 });
    expect(listRecipes(db)).toHaveLength(1);
  });

  it('imports nothing from a document with no recipes', () => {
    expect(importRecipes(db, JSON.stringify({ '@type': 'WebPage' }))).toEqual({
      imported: 0,
      skipped: 0,
    });
  });

  it('throws a SyntaxError on a file that is not JSON', () => {
    expect(() => importRecipes(db, 'no soy json')).toThrow(SyntaxError);
  });
});
