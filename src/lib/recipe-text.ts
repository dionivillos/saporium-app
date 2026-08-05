import type { IngredientInput, StepInput } from '@/validations/recipe';

// The form is free-text first: one ingredient per line, one step per
// paragraph. These helpers convert between that text and the stored rows.
// `rawText` is the source of truth, so the conversion never has to be clever.

export function parseIngredientLines(text: string): IngredientInput[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ name: line, rawText: line }));
}

/** Steps are separated by blank lines when present, otherwise by newlines. */
export function parseStepText(text: string): StepInput[] {
  const separator = /\n\s*\n/.test(text) ? /\n\s*\n/ : /\r?\n/;

  return text
    .split(separator)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((content) => ({ content }));
}

export function ingredientsToText(
  ingredients: { rawText?: string | null; name: string }[]
): string {
  return ingredients.map((ingredient) => ingredient.rawText ?? ingredient.name).join('\n');
}

export function stepsToText(steps: { content: string }[]): string {
  return steps.map((step) => step.content).join('\n\n');
}

/** Comma or newline separated, lowercased, de-duplicated, order preserved. */
export function parseTagText(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[,\n]/)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

export function tagsToText(tags: string[]): string {
  return tags.join(', ');
}

/** Empty input means "not set", never 0. */
export function parseOptionalNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;

  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

export function numberToText(value: number | null): string {
  return value === null ? '' : String(value);
}
