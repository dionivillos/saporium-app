import { eq } from 'drizzle-orm';

import type { Database } from '@/db/client';
import {
  createRecipe,
  deleteRecipePermanently,
  getRecipe,
  listRecipes,
  listTrashedRecipes,
  restoreRecipe,
  softDeleteRecipe,
  updateRecipe,
} from '@/db/recipes';
import { ingredients, recipeTags, steps, tags } from '@/db/schema';
import { createTestDatabase } from '@/test-utils/db';
import type { CreateRecipeInput } from '@/validations/recipe';

const tortilla: CreateRecipeInput = {
  title: 'Tortilla de patatas',
  ingredients: [
    { name: 'Patatas', quantity: '500', unit: 'g', rawText: '500 g de patatas' },
    { name: 'Huevos', quantity: '4', rawText: '4 huevos' },
  ],
  steps: [{ content: 'Pelar y cortar las patatas.' }, { content: 'Batir los huevos.' }],
  tags: ['Cena', 'ESPAÑOLA'],
};

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

describe('createRecipe', () => {
  it('stores the recipe with its ingredients, steps and tags', () => {
    const id = createRecipe(db, tortilla);
    const recipe = getRecipe(db, id);

    expect(recipe).not.toBeNull();
    expect(recipe?.title).toBe('Tortilla de patatas');
    expect(recipe?.ingredients.map((i) => i.name)).toEqual(['Patatas', 'Huevos']);
    expect(recipe?.steps.map((s) => s.content)).toEqual([
      'Pelar y cortar las patatas.',
      'Batir los huevos.',
    ]);
  });

  it('preserves the original ingredient line in rawText', () => {
    const id = createRecipe(db, tortilla);

    expect(getRecipe(db, id)?.ingredients[0]?.rawText).toBe('500 g de patatas');
  });

  it('assigns positions from array order', () => {
    const id = createRecipe(db, tortilla);
    const recipe = getRecipe(db, id);

    expect(recipe?.ingredients.map((i) => i.position)).toEqual([0, 1]);
    expect(recipe?.steps.map((s) => s.position)).toEqual([0, 1]);
  });

  it('lowercases tags', () => {
    const id = createRecipe(db, tortilla);

    expect(getRecipe(db, id)?.tags).toEqual(['cena', 'española']);
  });

  it('applies defaults for everything that is not required', () => {
    const id = createRecipe(db, tortilla);
    const recipe = getRecipe(db, id);

    expect(recipe?.servingsMin).toBe(1);
    expect(recipe?.language).toBe('es');
    expect(recipe?.difficulty).toBeNull();
    expect(recipe?.deletedAt).toBeNull();
  });

  it('reuses an existing tag instead of duplicating it', () => {
    createRecipe(db, tortilla);
    createRecipe(db, { ...tortilla, title: 'Otra tortilla', tags: ['cena'] });

    expect(db.select().from(tags).where(eq(tags.name, 'cena')).all()).toHaveLength(1);
  });

  it('rejects a recipe without a title', () => {
    expect(() => createRecipe(db, { ...tortilla, title: '' })).toThrow();
  });

  it('rejects a recipe with no ingredients or no steps', () => {
    expect(() => createRecipe(db, { ...tortilla, ingredients: [] })).toThrow();
    expect(() => createRecipe(db, { ...tortilla, steps: [] })).toThrow();
  });
});

describe('updateRecipe', () => {
  it('replaces ingredients, steps and tags wholesale', () => {
    const id = createRecipe(db, tortilla);

    updateRecipe(db, id, {
      title: 'Tortilla con cebolla',
      ingredients: [{ name: 'Cebolla' }],
      steps: [{ content: 'Pochar la cebolla.' }],
      tags: ['cena'],
    });
    const recipe = getRecipe(db, id);

    expect(recipe?.title).toBe('Tortilla con cebolla');
    expect(recipe?.ingredients.map((i) => i.name)).toEqual(['Cebolla']);
    expect(recipe?.steps.map((s) => s.content)).toEqual(['Pochar la cebolla.']);
    expect(recipe?.tags).toEqual(['cena']);
  });

  it('leaves untouched fields alone', () => {
    const id = createRecipe(db, { ...tortilla, description: 'La de siempre' });

    updateRecipe(db, id, { title: 'Tortilla buena' });

    expect(getRecipe(db, id)?.description).toBe('La de siempre');
  });

  it('does not leave orphaned children behind', () => {
    const id = createRecipe(db, tortilla);

    updateRecipe(db, id, { ingredients: [{ name: 'Cebolla' }] });

    expect(db.select().from(ingredients).all()).toHaveLength(1);
  });
});

describe('trash', () => {
  it('hides trashed recipes from the list and shows them in the trash', () => {
    const id = createRecipe(db, tortilla);

    softDeleteRecipe(db, id);

    expect(listRecipes(db)).toHaveLength(0);
    expect(listTrashedRecipes(db).map((r) => r.id)).toEqual([id]);
  });

  it('restores a trashed recipe with its children intact', () => {
    const id = createRecipe(db, tortilla);

    softDeleteRecipe(db, id);
    restoreRecipe(db, id);
    const recipe = getRecipe(db, id);

    expect(listRecipes(db)).toHaveLength(1);
    expect(recipe?.deletedAt).toBeNull();
    expect(recipe?.ingredients).toHaveLength(2);
    expect(recipe?.tags).toEqual(['cena', 'española']);
  });
});

describe('deleteRecipePermanently', () => {
  it('removes the recipe and cascades to its children', () => {
    const id = createRecipe(db, tortilla);

    deleteRecipePermanently(db, id);

    expect(getRecipe(db, id)).toBeNull();
    expect(db.select().from(ingredients).all()).toHaveLength(0);
    expect(db.select().from(steps).all()).toHaveLength(0);
    expect(db.select().from(recipeTags).all()).toHaveLength(0);
  });

  it('keeps the tags themselves, which are shared', () => {
    const id = createRecipe(db, tortilla);

    deleteRecipePermanently(db, id);

    expect(db.select().from(tags).all()).toHaveLength(2);
  });
});
