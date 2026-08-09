import { AiError, requestStructured } from '@/lib/ai/client';
import type { AiCredentials } from '@/lib/ai/credentials';
import { createRecipeSchema, type CreateRecipeInput } from '@/validations/recipe';

/**
 * Turning a pasted blob of text into a recipe.
 *
 * The model is asked to extract, never to cook: it may only report what the
 * text says. A model that helpfully invents "sal al gusto" produces a recipe
 * the user never wrote and cannot tell apart from one they did, which is worse
 * than a missing field.
 *
 * Its answer is validated with the same Zod schema every other path uses. The
 * model never reaches the database — the user does, by submitting the form.
 */

const SYSTEM = [
  'You extract a recipe from text the user pasted. You never invent.',
  'Only report what the text actually says. If a quantity, a time, a number of',
  'servings or a difficulty is not stated, leave it null rather than guessing.',
  'Never add ingredients or steps that are not in the text.',
  'Keep the original wording and language of the text.',
  'For each ingredient, rawText is the line exactly as written; name, quantity',
  'and unit are a best-effort split of it and may be null.',
  'Steps keep the order they appear in.',
  'Tags are lowercase, at most ten, and only if the text suggests them.',
  'If the text is not a recipe at all, return isRecipe false and nothing else.',
].join(' ');

const SCHEMA = {
  type: 'object',
  properties: {
    isRecipe: { type: 'boolean' },
    title: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    difficulty: { type: ['string', 'null'], enum: ['easy', 'medium', 'hard', null] },
    prepTimeMinutes: { type: ['integer', 'null'] },
    cookTimeMinutes: { type: ['integer', 'null'] },
    servingsMin: { type: ['integer', 'null'] },
    servingsMax: { type: ['integer', 'null'] },
    tips: { type: ['string', 'null'] },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rawText: { type: 'string' },
          name: { type: ['string', 'null'] },
          quantity: { type: ['string', 'null'] },
          unit: { type: ['string', 'null'] },
        },
        required: ['rawText', 'name', 'quantity', 'unit'],
        additionalProperties: false,
      },
    },
    steps: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'isRecipe',
    'title',
    'description',
    'difficulty',
    'prepTimeMinutes',
    'cookTimeMinutes',
    'servingsMin',
    'servingsMax',
    'tips',
    'ingredients',
    'steps',
    'tags',
  ],
  additionalProperties: false,
} as const;

type Extracted = {
  isRecipe?: unknown;
  title?: unknown;
  description?: unknown;
  difficulty?: unknown;
  prepTimeMinutes?: unknown;
  cookTimeMinutes?: unknown;
  servingsMin?: unknown;
  servingsMax?: unknown;
  tips?: unknown;
  ingredients?: unknown;
  steps?: unknown;
  tags?: unknown;
};

/** Raised when the model understood the request but the text held no recipe. */
export class NotARecipeError extends Error {
  constructor() {
    super('not-a-recipe');
    this.name = 'NotARecipeError';
  }
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

function ingredientsOf(value: unknown): CreateRecipeInput['ingredients'] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const row = item as { rawText?: unknown; name?: unknown; quantity?: unknown; unit?: unknown };
    const rawText = text(row.rawText);
    if (rawText === null) return [];

    // The line the user pasted is the source of truth; the split is a nicety.
    return [
      {
        name: text(row.name) ?? rawText,
        quantity: text(row.quantity),
        unit: text(row.unit),
        rawText,
      },
    ];
  });
}

function stepsOf(value: unknown): CreateRecipeInput['steps'] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const content = text(item);
    return content === null ? [] : [{ content }];
  });
}

function tagsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const names = value.flatMap((item) => {
    const tag = text(item);
    return tag === null ? [] : [tag.toLowerCase()];
  });

  return [...new Set(names)].slice(0, 10);
}

function difficultyOf(value: unknown): CreateRecipeInput['difficulty'] {
  return value === 'easy' || value === 'medium' || value === 'hard' ? value : null;
}

/**
 * Asks the model for the recipe in the text and validates what comes back.
 * Throws `NotARecipeError` for a paste that is not a recipe, and `AiError`
 * when the model answered something unusable.
 */
export async function recipeFromText(
  credentials: AiCredentials,
  pasted: string,
  fetcher?: typeof globalThis.fetch
): Promise<CreateRecipeInput> {
  const answer = (await requestStructured(
    credentials,
    {
      system: SYSTEM,
      prompt: pasted,
      schemaName: 'extracted_recipe',
      schema: SCHEMA as unknown as Record<string, unknown>,
    },
    fetcher
  )) as Extracted;

  if (typeof answer !== 'object' || answer === null) throw new AiError('bad-response');
  if (answer.isRecipe === false) throw new NotARecipeError();

  const candidate = {
    title: text(answer.title) ?? '',
    description: text(answer.description),
    difficulty: difficultyOf(answer.difficulty),
    prepTimeMinutes: count(answer.prepTimeMinutes),
    cookTimeMinutes: count(answer.cookTimeMinutes),
    servingsMin: count(answer.servingsMin) ?? 1,
    servingsMax: count(answer.servingsMax),
    tips: text(answer.tips),
    ingredients: ingredientsOf(answer.ingredients),
    steps: stepsOf(answer.steps),
    tags: tagsOf(answer.tags),
  };

  // A model that returns a title and nothing else has not found a recipe,
  // whatever it claimed in isRecipe.
  const parsed = createRecipeSchema.safeParse(candidate);
  if (!parsed.success) throw new NotARecipeError();

  return parsed.data;
}
