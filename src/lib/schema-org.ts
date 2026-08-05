import type { RecipeWithDetails } from '@/db/recipes';
import { MAX_TAGS, type CreateRecipeInput } from '@/validations/recipe';

// Mapping to and from schema.org/Recipe (JSON-LD). This is the interchange
// format for backups and the shape recipe sites embed for SEO, so the reverse
// direction has to survive the messy real world, not just our own exports.

export type SchemaOrgRecipe = Record<string, unknown>;

// ─── Durations ───────────────────────────────────────────────────────────────

/** Minutes as an ISO-8601 duration (`PT1H30M`), or undefined when unset. */
export function toIsoDuration(minutes: number | null): string | undefined {
  if (minutes === null || minutes <= 0) return undefined;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return `PT${hours > 0 ? `${hours}H` : ''}${rest > 0 ? `${rest}M` : ''}`;
}

/** Parses `PT1H30M`, `PT45M`, `P0DT1H` and friends into minutes. */
export function parseIsoDuration(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== 'string') return null;

  const match = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?)?/i.exec(
    value.trim()
  );
  if (!match) return null;

  const [, days, hours, mins] = match;
  const total = Number(days ?? 0) * 24 * 60 + Number(hours ?? 0) * 60 + Number(mins ?? 0);

  return total > 0 ? Math.round(total) : null;
}

// ─── Export ──────────────────────────────────────────────────────────────────

export function toSchemaOrgRecipe(recipe: RecipeWithDetails): SchemaOrgRecipe {
  const json: SchemaOrgRecipe = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    inLanguage: recipe.language,
    recipeYield:
      recipe.servingsMax !== null && recipe.servingsMax !== recipe.servingsMin
        ? `${recipe.servingsMin}-${recipe.servingsMax}`
        : String(recipe.servingsMin),
    recipeIngredient: recipe.ingredients.map(
      (ingredient) =>
        ingredient.rawText ??
        [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' ')
    ),
    recipeInstructions: recipe.steps.map((step) => ({
      '@type': 'HowToStep',
      text: step.content,
    })),
    datePublished: recipe.createdAt.toISOString(),
    dateModified: recipe.updatedAt.toISOString(),
  };

  if (recipe.description !== null) json.description = recipe.description;
  if (recipe.sourceUrl !== null) json.url = recipe.sourceUrl;

  const prep = toIsoDuration(recipe.prepTimeMinutes);
  const cook = toIsoDuration(recipe.cookTimeMinutes);
  const total = toIsoDuration(recipe.totalTimeMinutes);
  if (prep) json.prepTime = prep;
  if (cook) json.cookTime = cook;
  if (total) json.totalTime = total;

  if (recipe.tags.length > 0) {
    json.recipeCategory = recipe.tags;
    json.keywords = recipe.tags.join(', ');
  }

  // schema.org has no field for tips or difficulty. Dropping them would lose
  // the user's data on a round trip, so they ride along: `comment` is the
  // closest standard fit for tips, and `difficulty` is our own extension that
  // other readers will simply ignore.
  if (recipe.tips !== null) json.comment = recipe.tips;
  if (recipe.difficulty !== null) json.difficulty = recipe.difficulty;

  return json;
}

/** The whole collection as one JSON document. */
export function toSchemaOrgCollection(recipes: RecipeWithDetails[]): string {
  return JSON.stringify(recipes.map(toSchemaOrgRecipe), null, 2);
}

// ─── Import ──────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasType(value: Record<string, unknown>, type: string): boolean {
  const raw = value['@type'];
  if (typeof raw === 'string') return raw.toLowerCase() === type;
  if (Array.isArray(raw)) return raw.some((t) => typeof t === 'string' && t.toLowerCase() === type);
  return false;
}

/**
 * Digs every Recipe object out of an arbitrary JSON-LD document: a bare
 * recipe, an array, an `@graph`, or an `ItemList` — each of which real sites
 * and other recipe apps do use.
 */
export function extractRecipes(document: unknown): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];

  const visit = (node: unknown, depth: number): void => {
    if (depth > 6) return;

    if (Array.isArray(node)) {
      for (const child of node) visit(child, depth + 1);
      return;
    }
    if (!isRecord(node)) return;

    if (hasType(node, 'recipe')) {
      found.push(node);
      return;
    }

    for (const key of ['@graph', 'itemListElement', 'item', 'mainEntity', 'mainEntityOfPage']) {
      if (key in node) visit(node[key], depth + 1);
    }
  };

  visit(document, 0);

  return found;
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found !== null) return found;
    }
    return null;
  }
  if (isRecord(value)) return firstString(value.text ?? value.name ?? value['@value']);
  return null;
}

function toStringList(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map(firstString).filter((item): item is string => item !== null);
  }
  const single = firstString(value);
  return single === null ? [] : [single];
}

/**
 * Instructions come as plain strings, `HowToStep` objects, or `HowToSection`s
 * that nest the real steps one level down.
 */
function extractSteps(value: unknown, depth = 0): string[] {
  if (depth > 4) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractSteps(item, depth + 1));
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (isRecord(value)) {
    if (hasType(value, 'howtosection')) {
      return extractSteps(value.itemListElement ?? value.steps, depth + 1);
    }
    const text = firstString(value.text ?? value.name);
    return text === null ? [] : [text];
  }
  return [];
}

/** `4`, `"4"`, `"4-6"`, `"serves 4"`, `["4"]` → min/max servings. */
function parseYield(value: unknown): { min: number; max: number | null } {
  const raw = firstString(value);
  if (raw === null) return { min: 1, max: null };

  const numbers = raw.match(/\d+/g);
  if (!numbers || numbers.length === 0) return { min: 1, max: null };

  const min = Number(numbers[0]);
  const max = numbers.length > 1 ? Number(numbers[1]) : null;

  return {
    min: min > 0 ? min : 1,
    max: max !== null && max > min ? max : null,
  };
}

function parseDifficulty(value: unknown): CreateRecipeInput['difficulty'] {
  const raw = firstString(value)?.toLowerCase();
  if (raw === 'easy' || raw === 'medium' || raw === 'hard') return raw;
  return null;
}

/** Only keep a source URL our validation will accept. */
function parseUrl(value: unknown): string | null {
  const raw = firstString(value);
  if (raw === null) return null;

  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Maps one schema.org Recipe onto our create input, or null when there is not
 * enough to build a recipe with (a title, an ingredient and a step).
 */
export function fromSchemaOrgRecipe(node: unknown): CreateRecipeInput | null {
  if (!isRecord(node)) return null;

  const title = firstString(node.name ?? node.headline);
  if (title === null) return null;

  const ingredientLines = toStringList(node.recipeIngredient ?? node.ingredients);
  const stepLines = extractSteps(node.recipeInstructions ?? node.steps);
  if (ingredientLines.length === 0 || stepLines.length === 0) return null;

  const servings = parseYield(node.recipeYield ?? node.yield);
  const tags = [
    ...new Set(
      [...toStringList(node.recipeCategory), ...toStringList(node.keywords)].map((tag) =>
        tag.toLowerCase()
      )
    ),
  ].slice(0, MAX_TAGS);

  return {
    title,
    description: firstString(node.description),
    difficulty: parseDifficulty(node.difficulty),
    prepTimeMinutes: parseIsoDuration(node.prepTime),
    cookTimeMinutes: parseIsoDuration(node.cookTime),
    totalTimeMinutes: parseIsoDuration(node.totalTime),
    servingsMin: servings.min,
    servingsMax: servings.max,
    tips: firstString(node.comment),
    sourceUrl: parseUrl(node.url),
    language: firstString(node.inLanguage) ?? 'es',
    // The line as written is the source of truth; splitting it into quantity
    // and unit is a nicety the form can do later.
    ingredients: ingredientLines.map((line) => ({ name: line, rawText: line })),
    steps: stepLines.map((content) => ({ content })),
    tags,
  };
}
