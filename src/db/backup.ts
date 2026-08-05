import { extractRecipes, fromSchemaOrgRecipe, toSchemaOrgCollection } from '@/lib/schema-org';
import { createRecipeSchema } from '@/validations/recipe';

import type { Database } from './client';
import { createRecipe, getRecipe, listRecipes } from './recipes';

export type ImportSummary = {
  imported: number;
  /**
   * Recipe entries the file contained that could not be added — missing a
   * title, ingredients or steps. Counted rather than dropped silently, so the
   * user is never told "imported 1" about a file holding ten recipes.
   */
  skipped: number;
};

/**
 * Every recipe currently in the collection, as a schema.org/Recipe JSON
 * document. Trashed recipes are left out — they are deleted as far as the user
 * is concerned.
 */
export function exportRecipes(db: Database): string {
  const details = listRecipes(db)
    .map((recipe) => getRecipe(db, recipe.id))
    .filter((recipe): recipe is NonNullable<typeof recipe> => recipe !== null);

  return toSchemaOrgCollection(details);
}

/**
 * Adds every recipe a JSON-LD document yields. Existing recipes are never
 * touched: an import only ever adds, so a mistake can be undone by deleting
 * what came in rather than by hunting for overwritten data.
 *
 * @throws SyntaxError when the text is not JSON.
 */
export function importRecipes(db: Database, json: string): ImportSummary {
  const nodes = extractRecipes(JSON.parse(json));

  let imported = 0;
  let skipped = 0;

  for (const node of nodes) {
    // Neither an unmappable entry nor one our validation rejects may abort the
    // rest of the import.
    const candidate = fromSchemaOrgRecipe(node);
    if (candidate === null || !createRecipeSchema.safeParse(candidate).success) {
      skipped += 1;
      continue;
    }

    createRecipe(db, candidate);
    imported += 1;
  }

  return { imported, skipped };
}
