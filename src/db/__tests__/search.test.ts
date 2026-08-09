import type { Database } from '@/db/client';
import {
  activeFilterCount,
  createRecipe,
  listRecipes,
  listUsedTags,
  NO_FILTERS,
  softDeleteRecipe,
  type RecipeFilters,
  type RecipeSort,
} from '@/db/recipes';
import { createTestDatabase } from '@/test-utils/db';
import type { CreateRecipeInput } from '@/validations/recipe';

const pure: CreateRecipeInput = {
  title: 'Puré de calabaza',
  difficulty: 'easy',
  ingredients: [{ name: 'Calabaza', rawText: '1 kg de calabaza' }],
  steps: [{ content: 'Cocer la calabaza.' }],
  tags: ['cena'],
};

const lentejas: CreateRecipeInput = {
  title: 'Lentejas',
  difficulty: 'medium',
  ingredients: [
    { name: 'Lentejas', rawText: '300 g de lentejas' },
    { name: 'Chorizo', rawText: '2 chorizos' },
  ],
  steps: [{ content: 'Cocer a fuego lento.' }],
  tags: ['guiso'],
};

const nino: CreateRecipeInput = {
  title: 'Tarta para el niño',
  ingredients: [{ name: 'Harina', rawText: '200 g de harina' }],
  steps: [{ content: 'Hornear.' }],
  tags: [],
};

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

function search(overrides: Partial<RecipeFilters>): string[] {
  return listRecipes(db, { ...NO_FILTERS, ...overrides }).map((recipe) => recipe.title);
}

describe('search', () => {
  beforeEach(() => {
    createRecipe(db, pure);
    createRecipe(db, lentejas);
    createRecipe(db, nino);
  });

  it('matches part of a title regardless of case', () => {
    expect(search({ search: 'LENTE' })).toEqual(['Lentejas']);
  });

  it('matches an ingredient the title does not mention', () => {
    expect(search({ search: 'chorizo' })).toEqual(['Lentejas']);
  });

  it('ignores accents in the recipe', () => {
    expect(search({ search: 'pure' })).toEqual(['Puré de calabaza']);
  });

  it('ignores accents in the search term', () => {
    expect(search({ search: 'puré' })).toEqual(['Puré de calabaza']);
  });

  it('folds ñ, so the tilde is never needed to find anything', () => {
    expect(search({ search: 'nino' })).toEqual(['Tarta para el niño']);
  });

  it('treats wildcards as literal text', () => {
    expect(search({ search: '%' })).toEqual([]);
  });

  it('returns everything when the term is only whitespace', () => {
    expect(search({ search: '   ' })).toHaveLength(3);
  });

  it('excludes trashed recipes', () => {
    const id = listRecipes(db).find((recipe) => recipe.title === 'Lentejas')?.id;
    softDeleteRecipe(db, id ?? '');

    expect(search({ search: 'lentejas' })).toEqual([]);
  });
});

describe('filters', () => {
  beforeEach(() => {
    createRecipe(db, pure);
    createRecipe(db, lentejas);
    createRecipe(db, nino);
  });

  it('filters by difficulty', () => {
    expect(search({ difficulty: 'easy' })).toEqual(['Puré de calabaza']);
  });

  it('filters by tag', () => {
    expect(search({ tag: 'guiso' })).toEqual(['Lentejas']);
  });

  it('composes search with filters', () => {
    expect(search({ search: 'calabaza', difficulty: 'easy' })).toEqual(['Puré de calabaza']);
    expect(search({ search: 'calabaza', difficulty: 'hard' })).toEqual([]);
    expect(search({ search: 'calabaza', tag: 'guiso' })).toEqual([]);
  });

  it('composes both filters', () => {
    expect(search({ difficulty: 'medium', tag: 'guiso' })).toEqual(['Lentejas']);
    expect(search({ difficulty: 'easy', tag: 'guiso' })).toEqual([]);
  });
});

describe('sorting', () => {
  function titlesSortedBy(sort: RecipeSort): string[] {
    return listRecipes(db, NO_FILTERS, sort).map((recipe) => recipe.title);
  }

  const base = { ingredients: [{ name: 'x' }], steps: [{ content: 'y' }], tags: [] };

  it('orders alphabetically, folding accents so Ñ does not land after Z', () => {
    createRecipe(db, { ...base, title: 'Sopa' });
    createRecipe(db, { ...base, title: 'Ñoquis' });
    createRecipe(db, { ...base, title: 'arroz' });

    expect(titlesSortedBy('title')).toEqual(['arroz', 'Ñoquis', 'Sopa']);
  });

  it('orders by the time a recipe actually takes, adding prep and cook', () => {
    createRecipe(db, { ...base, title: 'Larga', totalTimeMinutes: 90 });
    createRecipe(db, { ...base, title: 'Corta', prepTimeMinutes: 5, cookTimeMinutes: 10 });
    createRecipe(db, { ...base, title: 'Media', prepTimeMinutes: 30 });

    expect(titlesSortedBy('time')).toEqual(['Corta', 'Media', 'Larga']);
  });

  it('puts recipes with no time at the end, because unknown is not zero', () => {
    createRecipe(db, { ...base, title: 'Sin tiempo' });
    createRecipe(db, { ...base, title: 'Con tiempo', totalTimeMinutes: 45 });

    expect(titlesSortedBy('time')).toEqual(['Con tiempo', 'Sin tiempo']);
  });

  it('orders by servings, breaking ties by title', () => {
    createRecipe(db, { ...base, title: 'Banquete', servingsMin: 12 });
    createRecipe(db, { ...base, title: 'Pareja', servingsMin: 2 });
    createRecipe(db, { ...base, title: 'Almuerzo', servingsMin: 2 });

    expect(titlesSortedBy('servings')).toEqual(['Almuerzo', 'Pareja', 'Banquete']);
  });

  it('composes with filters and search', () => {
    createRecipe(db, { ...base, title: 'Sopa fácil', difficulty: 'easy', totalTimeMinutes: 60 });
    createRecipe(db, { ...base, title: 'Sopa rápida', difficulty: 'easy', totalTimeMinutes: 10 });
    createRecipe(db, { ...base, title: 'Sopa difícil', difficulty: 'hard', totalTimeMinutes: 5 });

    const result = listRecipes(db, { ...NO_FILTERS, search: 'sopa', difficulty: 'easy' }, 'time');

    expect(result.map((recipe) => recipe.title)).toEqual(['Sopa rápida', 'Sopa fácil']);
  });

  it('excludes trashed recipes whatever the order', () => {
    const id = createRecipe(db, { ...base, title: 'Borrada' });
    createRecipe(db, { ...base, title: 'Viva' });
    softDeleteRecipe(db, id);

    expect(titlesSortedBy('title')).toEqual(['Viva']);
  });
});

describe('activeFilterCount', () => {
  it('ignores the search term, which has its own field in the UI', () => {
    expect(activeFilterCount({ ...NO_FILTERS, search: 'lentejas' })).toBe(0);
  });

  it('counts each narrowing filter', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...NO_FILTERS, difficulty: 'easy' })).toBe(1);
    expect(activeFilterCount({ ...NO_FILTERS, difficulty: 'easy', tag: 'cena' })).toBe(2);
  });
});

describe('listUsedTags', () => {
  it('lists tags in use, sorted, without duplicates', () => {
    createRecipe(db, pure);
    createRecipe(db, { ...lentejas, tags: ['guiso', 'cena'] });

    expect(listUsedTags(db)).toEqual(['cena', 'guiso']);
  });

  it('drops tags whose only recipe is in the trash', () => {
    const id = createRecipe(db, lentejas);
    softDeleteRecipe(db, id);

    expect(listUsedTags(db)).toEqual([]);
  });
});
