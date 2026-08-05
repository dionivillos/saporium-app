import {
  extractRecipes,
  fromSchemaOrgRecipe,
  parseIsoDuration,
  toIsoDuration,
  toSchemaOrgRecipe,
} from '@/lib/schema-org';
import { makeRecipeWithDetails } from '@/test-utils/fixtures';

describe('durations', () => {
  it('formats minutes as ISO-8601', () => {
    expect(toIsoDuration(45)).toBe('PT45M');
    expect(toIsoDuration(90)).toBe('PT1H30M');
    expect(toIsoDuration(120)).toBe('PT2H');
    expect(toIsoDuration(null)).toBeUndefined();
    expect(toIsoDuration(0)).toBeUndefined();
  });

  it('parses the shapes real sites publish', () => {
    expect(parseIsoDuration('PT45M')).toBe(45);
    expect(parseIsoDuration('PT1H30M')).toBe(90);
    expect(parseIsoDuration('PT2H')).toBe(120);
    expect(parseIsoDuration('P0DT1H15M')).toBe(75);
    expect(parseIsoDuration('pt30m')).toBe(30);
  });

  it('gives up on nonsense rather than guessing', () => {
    expect(parseIsoDuration('un ratito')).toBeNull();
    expect(parseIsoDuration(undefined)).toBeNull();
    expect(parseIsoDuration('PT0M')).toBeNull();
  });
});

describe('extractRecipes', () => {
  const recipe = { '@type': 'Recipe', name: 'Tortilla' };

  it('finds a bare recipe', () => {
    expect(extractRecipes(recipe)).toHaveLength(1);
  });

  it('finds recipes in an array', () => {
    expect(extractRecipes([recipe, recipe])).toHaveLength(2);
  });

  it('digs into @graph, as most recipe sites publish', () => {
    expect(extractRecipes({ '@graph': [{ '@type': 'WebPage' }, recipe] })).toHaveLength(1);
  });

  it('digs into an ItemList', () => {
    const list = { '@type': 'ItemList', itemListElement: [{ item: recipe }] };

    expect(extractRecipes(list)).toHaveLength(1);
  });

  it('handles @type given as an array', () => {
    expect(extractRecipes({ '@type': ['Recipe', 'Thing'], name: 'X' })).toHaveLength(1);
  });

  it('returns nothing for a document with no recipe', () => {
    expect(extractRecipes({ '@type': 'WebPage' })).toHaveLength(0);
    expect(extractRecipes('not json-ld')).toHaveLength(0);
  });
});

describe('fromSchemaOrgRecipe', () => {
  const base = {
    '@type': 'Recipe',
    name: 'Lentejas',
    recipeIngredient: ['400 g de lentejas', '2 zanahorias'],
    recipeInstructions: [
      { '@type': 'HowToStep', text: 'Sofríe la verdura.' },
      { '@type': 'HowToStep', text: 'Cuece 40 minutos.' },
    ],
  };

  it('maps the essentials', () => {
    const recipe = fromSchemaOrgRecipe(base);

    expect(recipe?.title).toBe('Lentejas');
    expect(recipe?.ingredients).toHaveLength(2);
    expect(recipe?.steps).toHaveLength(2);
  });

  it('keeps the ingredient line verbatim in rawText', () => {
    const recipe = fromSchemaOrgRecipe(base);

    expect(recipe?.ingredients[0]).toMatchObject({
      name: '400 g de lentejas',
      rawText: '400 g de lentejas',
    });
  });

  it('accepts instructions as plain strings', () => {
    const recipe = fromSchemaOrgRecipe({ ...base, recipeInstructions: 'Paso uno\nPaso dos' });

    expect(recipe?.steps.map((step) => step.content)).toEqual(['Paso uno', 'Paso dos']);
  });

  it('flattens HowToSection groupings', () => {
    const recipe = fromSchemaOrgRecipe({
      ...base,
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          name: 'Masa',
          itemListElement: [{ '@type': 'HowToStep', text: 'Amasa.' }],
        },
        { '@type': 'HowToStep', text: 'Hornea.' },
      ],
    });

    expect(recipe?.steps.map((step) => step.content)).toEqual(['Amasa.', 'Hornea.']);
  });

  it('reads servings from the many recipeYield shapes', () => {
    expect(fromSchemaOrgRecipe({ ...base, recipeYield: '4' })).toMatchObject({ servingsMin: 4 });
    expect(fromSchemaOrgRecipe({ ...base, recipeYield: 6 })).toMatchObject({ servingsMin: 6 });
    expect(fromSchemaOrgRecipe({ ...base, recipeYield: '4-6' })).toMatchObject({
      servingsMin: 4,
      servingsMax: 6,
    });
    expect(fromSchemaOrgRecipe({ ...base, recipeYield: '4 raciones' })).toMatchObject({
      servingsMin: 4,
      servingsMax: null,
    });
  });

  it('defaults to one serving when there is no usable yield', () => {
    expect(fromSchemaOrgRecipe(base)).toMatchObject({ servingsMin: 1, servingsMax: null });
  });

  it('lowercases tags, merges the sources and caps them', () => {
    const recipe = fromSchemaOrgRecipe({
      ...base,
      recipeCategory: ['Cena'],
      keywords: 'CENA, legumbres, invierno',
    });

    expect(recipe?.tags).toEqual(['cena', 'legumbres', 'invierno']);
  });

  it('ignores a source url our validation would reject', () => {
    expect(fromSchemaOrgRecipe({ ...base, url: 'javascript:alert(1)' })?.sourceUrl).toBeNull();
    expect(fromSchemaOrgRecipe({ ...base, url: 'no soy una url' })?.sourceUrl).toBeNull();
    expect(fromSchemaOrgRecipe({ ...base, url: 'https://ejemplo.com/r' })?.sourceUrl).toBe(
      'https://ejemplo.com/r'
    );
  });

  it('refuses anything that is not a usable recipe', () => {
    expect(fromSchemaOrgRecipe({ ...base, name: undefined })).toBeNull();
    expect(fromSchemaOrgRecipe({ ...base, recipeIngredient: [] })).toBeNull();
    expect(fromSchemaOrgRecipe({ ...base, recipeInstructions: [] })).toBeNull();
    expect(fromSchemaOrgRecipe('nope')).toBeNull();
  });
});

describe('round trip', () => {
  it('preserves what the user typed', () => {
    const original = makeRecipeWithDetails({
      title: 'Bizcocho',
      description: 'Muy fácil',
      difficulty: 'medium',
      prepTimeMinutes: 10,
      cookTimeMinutes: 40,
      servingsMin: 4,
      servingsMax: 6,
      tips: 'No abras el horno',
      tags: ['postre', 'horno'],
    });

    const [restored] = extractRecipes([toSchemaOrgRecipe(original)]).map(fromSchemaOrgRecipe);

    expect(restored).toMatchObject({
      title: 'Bizcocho',
      description: 'Muy fácil',
      difficulty: 'medium',
      prepTimeMinutes: 10,
      cookTimeMinutes: 40,
      servingsMin: 4,
      servingsMax: 6,
      tips: 'No abras el horno',
      tags: ['postre', 'horno'],
    });
    expect(restored?.ingredients[0]?.rawText).toBe('500 g de patatas');
    expect(restored?.steps[0]?.content).toBe('Pelar y cortar las patatas.');
  });

  it('skips unusable entries instead of failing the whole document', () => {
    const good = toSchemaOrgRecipe(makeRecipeWithDetails());

    const mapped = extractRecipes([good, { '@type': 'Recipe', name: 'Sin nada' }]).map(
      fromSchemaOrgRecipe
    );

    expect(mapped.filter((recipe) => recipe !== null)).toHaveLength(1);
  });
});
