import type { Database } from '@/db/client';
import {
  createRecipe,
  listRecipes,
  listUsedTags,
  NO_FILTERS,
  softDeleteRecipe,
  type RecipeFilters,
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
