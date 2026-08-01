import { z } from 'zod';

const ingredientSchema = z.object({
  name: z.string().min(1, 'El nombre del ingrediente es obligatorio').max(100),
  quantity: z.coerce.number().positive().nullable().optional(),
  unit: z.string().max(30).nullable().optional(),
  rawText: z.string().max(200).nullable().optional(),
  groupName: z.string().max(60).nullable().optional(),
  position: z.number().int().min(0),
});

const stepSchema = z.object({
  position: z.number().int().min(0),
  content: z.string().min(1, 'El paso no puede estar vacío').max(2000),
  imageUrl: z.string().url().nullable().optional(),
});

export const createRecipeSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio').max(200),
  description: z.string().max(1000).nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  prepTimeMinutes: z.number().int().min(0).nullable().optional(),
  cookTimeMinutes: z.number().int().min(0).nullable().optional(),
  totalTimeMinutes: z.number().int().min(0).nullable().optional(),
  servingsMin: z.number().int().min(1, 'Las raciones deben ser al menos 1'),
  servingsMax: z.number().int().min(1).nullable().optional(),
  tips: z.string().max(2000).nullable().optional(),
  visibility: z.enum(['public', 'private', 'draft']).default('public'),
  language: z.string().default('es'),
  ingredients: z.array(ingredientSchema).min(1, 'Añade al menos un ingrediente'),
  steps: z.array(stepSchema).min(1, 'Añade al menos un paso'),
  tags: z.array(z.string().min(1).max(40).transform((s) => s.toLowerCase())).max(10).default([]),
});

export const updateRecipeSchema = createRecipeSchema.partial().extend({
  ingredients: z.array(ingredientSchema).min(1).optional(),
  steps: z.array(stepSchema).min(1).optional(),
});

export const listRecipesSchema = z.object({
  q: z.string().max(200).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  tag: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type ListRecipesParams = z.infer<typeof listRecipesSchema>;
export type IngredientInput = z.infer<typeof ingredientSchema>;
export type StepInput = z.infer<typeof stepSchema>;