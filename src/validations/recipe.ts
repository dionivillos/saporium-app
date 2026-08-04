import { z } from 'zod';

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export const MAX_TAGS = 10;

export const ingredientInputSchema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.string().max(30).nullish(),
  unit: z.string().max(30).nullish(),
  /** The original line; importers and the free-text form always fill it. */
  rawText: z.string().max(300).nullish(),
  groupName: z.string().max(60).nullish(),
});

export const stepInputSchema = z.object({
  content: z.string().min(1).max(2000),
  imagePath: z.string().nullish(),
});

/**
 * Only title, one ingredient and one step are required. Everything else is
 * optional or defaulted — validation errors must never appear for anything
 * the user did not have to fill in.
 */
export const createRecipeSchema = z.object({
  title: z.string().min(1, 'recipes.form.titleRequired').max(200),
  description: z.string().max(1000).nullish(),
  difficulty: z.enum(DIFFICULTIES).nullish(),
  prepTimeMinutes: z.number().int().min(0).nullish(),
  cookTimeMinutes: z.number().int().min(0).nullish(),
  totalTimeMinutes: z.number().int().min(0).nullish(),
  servingsMin: z.number().int().min(1).default(1),
  servingsMax: z.number().int().min(1).nullish(),
  tips: z.string().max(2000).nullish(),
  coverImagePath: z.string().nullish(),
  sourceUrl: z.string().url().nullish(),
  language: z.string().min(2).max(10).default('es'),
  ingredients: z.array(ingredientInputSchema).min(1, 'recipes.form.ingredientsRequired'),
  steps: z.array(stepInputSchema).min(1, 'recipes.form.stepsRequired'),
  tags: z
    .array(
      z
        .string()
        .min(1)
        .max(40)
        .transform((tag) => tag.trim().toLowerCase())
    )
    .max(MAX_TAGS)
    .default([]),
});

export const updateRecipeSchema = createRecipeSchema.partial();

export type CreateRecipeInput = z.input<typeof createRecipeSchema>;
export type CreateRecipe = z.output<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.input<typeof updateRecipeSchema>;
export type IngredientInput = z.output<typeof ingredientInputSchema>;
export type StepInput = z.output<typeof stepInputSchema>;
export type Difficulty = (typeof DIFFICULTIES)[number];
