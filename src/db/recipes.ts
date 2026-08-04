import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';

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

/** Most recently touched first — trashed recipes never appear here. */
export function listRecipes(db: Database): Recipe[] {
  return db
    .select()
    .from(recipes)
    .where(isNull(recipes.deletedAt))
    .orderBy(desc(recipes.updatedAt))
    .all();
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
