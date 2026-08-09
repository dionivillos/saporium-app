import {
  and,
  desc,
  eq,
  exists,
  getTableColumns,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

import { escapeLikePattern, foldForSearch, FOLDED_CHARACTERS } from '@/lib/search-text';
import {
  createRecipeSchema,
  updateRecipeSchema,
  type CreateRecipeInput,
  type UpdateRecipeInput,
} from '@/validations/recipe';

import type { Database } from './client';
import { newId } from './id';
import { ingredients, recipeTags, recipes, steps, tags } from './schema';
import type { Ingredient, Recipe, Step } from './schema';

export type RecipeWithDetails = Recipe & {
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[];
};

/** Resolves tag names to ids, creating the ones that do not exist yet. */
function resolveTagIds(db: Database, names: string[]): string[] {
  const unique = [...new Set(names.filter((name) => name.length > 0))];
  if (unique.length === 0) return [];

  const existing = db.select().from(tags).where(inArray(tags.name, unique)).all();
  const byName = new Map(existing.map((tag) => [tag.name, tag.id]));

  const missing = unique.filter((name) => !byName.has(name));
  if (missing.length > 0) {
    const created = missing.map((name) => ({ id: newId(), name }));
    db.insert(tags).values(created).run();
    for (const tag of created) byName.set(tag.name, tag.id);
  }

  return unique.map((name) => {
    const id = byName.get(name);
    if (id === undefined) throw new Error(`Tag was not persisted: ${name}`);
    return id;
  });
}

function writeIngredients(db: Database, recipeId: string, rows: CreateRecipeInput['ingredients']) {
  if (rows.length === 0) return;
  db.insert(ingredients)
    .values(
      rows.map((row, position) => ({
        id: newId(),
        recipeId,
        position,
        name: row.name,
        quantity: row.quantity ?? null,
        unit: row.unit ?? null,
        rawText: row.rawText ?? null,
        groupName: row.groupName ?? null,
      }))
    )
    .run();
}

function writeSteps(db: Database, recipeId: string, rows: CreateRecipeInput['steps']) {
  if (rows.length === 0) return;
  db.insert(steps)
    .values(
      rows.map((row, position) => ({
        id: newId(),
        recipeId,
        position,
        content: row.content,
        imagePath: row.imagePath ?? null,
      }))
    )
    .run();
}

function writeTags(db: Database, recipeId: string, names: string[]) {
  const tagIds = resolveTagIds(db, names);
  if (tagIds.length === 0) return;
  db.insert(recipeTags)
    .values(tagIds.map((tagId) => ({ recipeId, tagId })))
    .run();
}

export function createRecipe(db: Database, input: CreateRecipeInput): string {
  const data = createRecipeSchema.parse(input);
  const id = newId();

  db.transaction((tx) => {
    tx.insert(recipes)
      .values({
        id,
        title: data.title,
        description: data.description ?? null,
        difficulty: data.difficulty ?? null,
        prepTimeMinutes: data.prepTimeMinutes ?? null,
        cookTimeMinutes: data.cookTimeMinutes ?? null,
        totalTimeMinutes: data.totalTimeMinutes ?? null,
        servingsMin: data.servingsMin,
        servingsMax: data.servingsMax ?? null,
        tips: data.tips ?? null,
        coverImagePath: data.coverImagePath ?? null,
        sourceUrl: data.sourceUrl ?? null,
        language: data.language,
      })
      .run();

    writeIngredients(tx, id, data.ingredients);
    writeSteps(tx, id, data.steps);
    writeTags(tx, id, data.tags);
  });

  return id;
}

/**
 * Children are replaced wholesale rather than diffed: positions come from array
 * order, so a diff would have to rewrite most rows anyway.
 */
export function updateRecipe(db: Database, id: string, input: UpdateRecipeInput): void {
  const data = updateRecipeSchema.parse(input);

  db.transaction((tx) => {
    tx.update(recipes)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description ?? null }),
        ...(data.difficulty !== undefined && { difficulty: data.difficulty ?? null }),
        ...(data.prepTimeMinutes !== undefined && {
          prepTimeMinutes: data.prepTimeMinutes ?? null,
        }),
        ...(data.cookTimeMinutes !== undefined && {
          cookTimeMinutes: data.cookTimeMinutes ?? null,
        }),
        ...(data.totalTimeMinutes !== undefined && {
          totalTimeMinutes: data.totalTimeMinutes ?? null,
        }),
        ...(data.servingsMin !== undefined && { servingsMin: data.servingsMin }),
        ...(data.servingsMax !== undefined && { servingsMax: data.servingsMax ?? null }),
        ...(data.tips !== undefined && { tips: data.tips ?? null }),
        ...(data.coverImagePath !== undefined && { coverImagePath: data.coverImagePath ?? null }),
        ...(data.sourceUrl !== undefined && { sourceUrl: data.sourceUrl ?? null }),
        ...(data.language !== undefined && { language: data.language }),
        updatedAt: new Date(),
      })
      .where(eq(recipes.id, id))
      .run();

    if (data.ingredients !== undefined) {
      tx.delete(ingredients).where(eq(ingredients.recipeId, id)).run();
      writeIngredients(tx, id, data.ingredients);
    }
    if (data.steps !== undefined) {
      tx.delete(steps).where(eq(steps.recipeId, id)).run();
      writeSteps(tx, id, data.steps);
    }
    if (data.tags !== undefined) {
      tx.delete(recipeTags).where(eq(recipeTags.recipeId, id)).run();
      writeTags(tx, id, data.tags);
    }
  });
}

export function getRecipe(db: Database, id: string): RecipeWithDetails | null {
  const recipe = db.select().from(recipes).where(eq(recipes.id, id)).get();
  if (!recipe) return null;

  return {
    ...recipe,
    ingredients: db
      .select()
      .from(ingredients)
      .where(eq(ingredients.recipeId, id))
      .orderBy(ingredients.position)
      .all(),
    steps: db.select().from(steps).where(eq(steps.recipeId, id)).orderBy(steps.position).all(),
    tags: db
      .select({ name: tags.name })
      .from(recipeTags)
      .innerJoin(tags, eq(tags.id, recipeTags.tagId))
      .where(eq(recipeTags.recipeId, id))
      .orderBy(tags.name)
      .all()
      .map((row) => row.name),
  };
}

export type RecipeFilters = {
  /** Free text; matched against the title and the recipe's ingredients. */
  search: string;
  difficulty: Recipe['difficulty'];
  tag: string | null;
};

export const NO_FILTERS: RecipeFilters = { search: '', difficulty: null, tag: null };

/** How many filters are narrowing the list, search aside — it has its own field. */
export function activeFilterCount(filters: RecipeFilters): number {
  return (filters.difficulty === null ? 0 : 1) + (filters.tag === null ? 0 : 1);
}

/**
 * Applies the same folding as `foldForSearch` inside SQLite. Nested `replace`
 * calls are unlovely, but they keep matching in the database — the alternative
 * is loading every recipe and its ingredients into memory to filter there.
 * Both the lowercase and uppercase forms are replaced because `lower()` leaves
 * accented capitals alone.
 */
function folded(column: SQLiteColumn): SQL {
  let expression: SQL = sql`lower(${column})`;
  for (const [accented, plain] of Object.entries(FOLDED_CHARACTERS)) {
    expression = sql`replace(${expression}, ${accented}, ${plain})`;
    expression = sql`replace(${expression}, ${accented.toUpperCase()}, ${plain})`;
  }
  return expression;
}

/** A NULL column yields NULL here, which behaves as "no match" inside OR. */
function matches(column: SQLiteColumn, pattern: string): SQL {
  return sql`${folded(column)} like ${pattern} escape '\\'`;
}

function searchCondition(db: Database, term: string): SQL | undefined {
  const normalized = foldForSearch(term).trim();
  if (normalized.length === 0) return undefined;

  const pattern = `%${escapeLikePattern(normalized)}%`;

  return or(
    matches(recipes.title, pattern),
    exists(
      db
        .select({ one: sql`1` })
        .from(ingredients)
        .where(
          and(
            eq(ingredients.recipeId, recipes.id),
            or(matches(ingredients.rawText, pattern), matches(ingredients.name, pattern))
          )
        )
    )
  );
}

function tagCondition(db: Database, name: string): SQL | undefined {
  return exists(
    db
      .select({ one: sql`1` })
      .from(recipeTags)
      .innerJoin(tags, eq(tags.id, recipeTags.tagId))
      .where(and(eq(recipeTags.recipeId, recipes.id), eq(tags.name, name)))
  );
}

/** A recipe as the list needs it: the row plus the tags its card shows. */
export type RecipeListEntry = Recipe & { tags: string[] };

/**
 * Cards show tags, and the placeholder art for a photo-less recipe is derived
 * from them, so they travel with the row. One `group_concat` beats a query per
 * card; the separator is a newline because a tag can contain a comma.
 */
const TAG_SEPARATOR = '\n';

const tagList = sql<string | null>`(
  select group_concat(${tags.name}, ${TAG_SEPARATOR})
  from ${recipeTags}
  inner join ${tags} on ${tags.id} = ${recipeTags.tagId}
  where ${recipeTags.recipeId} = ${recipes.id}
)`;

export const RECIPE_SORTS = ['recent', 'title', 'time', 'servings'] as const;

export type RecipeSort = (typeof RECIPE_SORTS)[number];

export const DEFAULT_SORT: RecipeSort = 'recent';

/**
 * What "how long does this take" means when a recipe only filled in some of
 * the fields; mirrors `effectiveTotalMinutes`. Null when it says nothing at
 * all, which sorts last rather than first — an unknown time is not zero.
 */
const effectiveMinutes = sql`case
  when ${recipes.totalTimeMinutes} is not null then ${recipes.totalTimeMinutes}
  when ${recipes.prepTimeMinutes} is not null or ${recipes.cookTimeMinutes} is not null
    then coalesce(${recipes.prepTimeMinutes}, 0) + coalesce(${recipes.cookTimeMinutes}, 0)
  else null
end`;

function ordering(sort: RecipeSort): SQL[] {
  switch (sort) {
    // Folded so "Ñoquis" and "Sopa" land where a reader expects, not after Z.
    case 'title':
      return [sql`${folded(recipes.title)} asc`];
    case 'time':
      return [sql`${effectiveMinutes} is null`, sql`${effectiveMinutes} asc`];
    case 'servings':
      return [sql`${recipes.servingsMin} asc`, sql`${folded(recipes.title)} asc`];
    case 'recent':
      return [sql`${recipes.updatedAt} desc`];
  }
}

/**
 * Trashed recipes excluded. Returned unexecuted so screens can hand it to
 * `useLiveQuery` and re-render on every write.
 */
export function recipeListQuery(
  db: Database,
  filters: RecipeFilters = NO_FILTERS,
  sort: RecipeSort = DEFAULT_SORT
) {
  const conditions = [
    isNull(recipes.deletedAt),
    searchCondition(db, filters.search),
    filters.difficulty === null ? undefined : eq(recipes.difficulty, filters.difficulty),
    filters.tag === null ? undefined : tagCondition(db, filters.tag),
  ];

  return db
    .select({ ...getTableColumns(recipes), tagList })
    .from(recipes)
    .where(and(...conditions))
    .orderBy(...ordering(sort));
}

/** Turns a row from `recipeListQuery` into the shape the card renders. */
export function toListEntry(row: Recipe & { tagList: string | null }): RecipeListEntry {
  const { tagList: joined, ...recipe } = row;

  return {
    ...recipe,
    tags: joined === null ? [] : joined.split(TAG_SEPARATOR).sort((a, b) => a.localeCompare(b)),
  };
}

export function listRecipes(
  db: Database,
  filters: RecipeFilters = NO_FILTERS,
  sort: RecipeSort = DEFAULT_SORT
): RecipeListEntry[] {
  return recipeListQuery(db, filters, sort).all().map(toListEntry);
}

/** Tags actually in use by a recipe that is not in the trash, for the filter row. */
export function listUsedTags(db: Database): string[] {
  return db
    .selectDistinct({ name: tags.name })
    .from(tags)
    .innerJoin(recipeTags, eq(recipeTags.tagId, tags.id))
    .innerJoin(recipes, eq(recipes.id, recipeTags.recipeId))
    .where(isNull(recipes.deletedAt))
    .orderBy(tags.name)
    .all()
    .map((row) => row.name);
}

export function listTrashedRecipes(db: Database): Recipe[] {
  return db
    .select()
    .from(recipes)
    .where(isNotNull(recipes.deletedAt))
    .orderBy(desc(recipes.deletedAt))
    .all();
}

/** Moves the recipe to the trash. Reversible with `restoreRecipe`. */
export function softDeleteRecipe(db: Database, id: string): void {
  db.update(recipes)
    .set({ deletedAt: new Date() })
    .where(and(eq(recipes.id, id), isNull(recipes.deletedAt)))
    .run();
}

export function restoreRecipe(db: Database, id: string): void {
  db.update(recipes).set({ deletedAt: null }).where(eq(recipes.id, id)).run();
}

/**
 * Irreversible. Children go with it through `ON DELETE CASCADE`, which needs
 * `PRAGMA foreign_keys = ON` on the connection (see client.ts).
 */
export function deleteRecipePermanently(db: Database, id: string): void {
  db.delete(recipes).where(eq(recipes.id, id)).run();
}
