// Mapeo al formato schema.org/Recipe (JSON-LD), compartido por el export
// y el marcado embebido en las páginas públicas de receta.

type RecipeInput = {
  title: string;
  description: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  servingsMin: number;
  servingsMax: number | null;
  coverImageUrl: string | null;
  language: string;
  createdAt: Date;
  updatedAt: Date;
};

type IngredientInput = {
  position: number;
  name: string;
  quantity: string | null;
  unit: string | null;
  rawText: string | null;
};

type StepInput = {
  position: number;
  content: string;
  imageUrl: string | null;
};

type Options = {
  url?: string;
  author?: { name: string; url?: string };
};

export function toSchemaOrgRecipe(
  recipe: RecipeInput,
  ingredients: IngredientInput[],
  steps: StepInput[],
  tagNames: string[],
  options: Options = {}
) {
  const sortedIngredients = [...ingredients].sort((a, b) => a.position - b.position);
  const sortedSteps = [...steps].sort((a, b) => a.position - b.position);

  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description ?? undefined,
    url: options.url,
    author: options.author
      ? { '@type': 'Person', name: options.author.name, url: options.author.url }
      : undefined,
    inLanguage: recipe.language,
    prepTime: recipe.prepTimeMinutes ? `PT${recipe.prepTimeMinutes}M` : undefined,
    cookTime: recipe.cookTimeMinutes ? `PT${recipe.cookTimeMinutes}M` : undefined,
    totalTime: recipe.totalTimeMinutes ? `PT${recipe.totalTimeMinutes}M` : undefined,
    recipeYield: recipe.servingsMax
      ? `${recipe.servingsMin}-${recipe.servingsMax}`
      : String(recipe.servingsMin),
    recipeCategory: tagNames,
    keywords: tagNames.length > 0 ? tagNames.join(', ') : undefined,
    recipeIngredient: sortedIngredients.map(
      (i) => i.rawText ?? [i.quantity, i.unit, i.name].filter(Boolean).join(' ')
    ),
    recipeInstructions: sortedSteps.map((s) => ({
      '@type': 'HowToStep',
      text: s.content,
      image: s.imageUrl ?? undefined,
    })),
    image: recipe.coverImageUrl ?? undefined,
    datePublished: recipe.createdAt.toISOString(),
    dateModified: recipe.updatedAt.toISOString(),
  };
}

/**
 * Serializa un objeto JSON-LD para embeberlo en un <script>.
 * Escapa `<` para impedir inyección de `</script>` desde texto de recetas.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
