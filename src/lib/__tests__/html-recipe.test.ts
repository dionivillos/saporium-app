import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { decodeEntities, extractJsonLd, recipeFromHtml, textOf } from '@/lib/html-recipe';

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf8');
}

describe('extractJsonLd', () => {
  it('reads every block that parses and skips the ones that do not', () => {
    // The fixture has one valid Organization, one broken block, and the recipe.
    expect(extractJsonLd(fixture('json-ld-sections.html'))).toHaveLength(2);
  });

  it('unwraps CDATA, which older CMSs still emit', () => {
    const documents = extractJsonLd(fixture('json-ld-sections.html'));

    expect(
      documents.some((document) => (document as { name?: string }).name === 'Lentejas de la abuela')
    ).toBe(true);
  });

  it('finds nothing in a page without JSON-LD', () => {
    expect(extractJsonLd('<html><body>Hola</body></html>')).toEqual([]);
  });
});

describe('recipeFromHtml with JSON-LD', () => {
  it('finds the recipe inside an @graph next to unrelated nodes', () => {
    const recipe = recipeFromHtml(fixture('json-ld-graph.html'));

    expect(recipe?.title).toBe('Tortilla de patatas');
    expect(recipe?.ingredients).toHaveLength(4);
    expect(recipe?.steps).toHaveLength(4);
  });

  it('accepts @type given as an array', () => {
    expect(recipeFromHtml(fixture('json-ld-graph.html'))).not.toBeNull();
  });

  it('keeps the site wording as the ingredient raw text', () => {
    const recipe = recipeFromHtml(fixture('json-ld-graph.html'));

    expect(recipe?.ingredients[0]?.rawText).toBe('500 g de patatas');
  });

  it('maps durations and servings', () => {
    const recipe = recipeFromHtml(fixture('json-ld-graph.html'));

    expect(recipe?.prepTimeMinutes).toBe(20);
    expect(recipe?.cookTimeMinutes).toBe(25);
    expect(recipe?.servingsMin).toBe(4);
  });

  it('takes tags from keywords', () => {
    expect(recipeFromHtml(fixture('json-ld-graph.html'))?.tags).toEqual(
      expect.arrayContaining(['española', 'cena'])
    );
  });

  it('flattens HowToSection groups into a single list of steps', () => {
    const recipe = recipeFromHtml(fixture('json-ld-sections.html'));

    expect(recipe?.title).toBe('Lentejas de la abuela');
    expect(recipe?.steps.map((step) => step.content)).toEqual([
      'Pocha la cebolla.',
      'Añade el pimentón fuera del fuego.',
      'Cuece 45 minutos.',
    ]);
  });

  it('reads an hour-and-minutes duration and a numeric yield', () => {
    const recipe = recipeFromHtml(fixture('json-ld-sections.html'));

    expect(recipe?.totalTimeMinutes).toBe(90);
    expect(recipe?.servingsMin).toBe(6);
  });
});

describe('recipeFromHtml with microdata', () => {
  it('falls back to microdata when there is no JSON-LD', () => {
    const recipe = recipeFromHtml(fixture('microdata.html'));

    expect(recipe?.title).toBe('Bizcocho de yogur');
    expect(recipe?.steps[0]?.content).toBe('Mezcla el yogur con el azúcar.');
  });

  it('decodes entities in the values it reads', () => {
    const recipe = recipeFromHtml(fixture('microdata.html'));

    expect(recipe?.ingredients.map((ingredient) => ingredient.rawText)).toEqual([
      '1 yogur natural',
      '2 vasos de azúcar',
      '3 vasos de harina',
    ]);
  });

  it('reads durations from meta content attributes', () => {
    const recipe = recipeFromHtml(fixture('microdata.html'));

    expect(recipe?.prepTimeMinutes).toBe(15);
    expect(recipe?.cookTimeMinutes).toBe(35);
  });

  it('treats a <br> inside an instruction as a step break, like a newline anywhere else', () => {
    const recipe = recipeFromHtml(fixture('microdata.html'));

    expect(recipe?.steps.map((step) => step.content)).toEqual([
      'Mezcla el yogur con el azúcar.',
      'Añade la harina tamizada.',
      'Remueve bien.',
      'Hornea 35 minutos a 180°.',
    ]);
  });
});

describe('recipeFromHtml when there is nothing to import', () => {
  it('returns null for a page whose JSON-LD is not a recipe', () => {
    expect(recipeFromHtml(fixture('no-recipe.html'))).toBeNull();
  });

  it('returns null for a page with no structured data at all', () => {
    expect(recipeFromHtml('<html><body><p>Solo texto</p></body></html>')).toBeNull();
  });

  it('returns null for a Recipe scope that has no ingredients', () => {
    const html = `<div itemtype="https://schema.org/Recipe"><h1 itemprop="name">Vacía</h1></div>`;

    expect(recipeFromHtml(html)).toBeNull();
  });
});

describe('textOf', () => {
  it('drops tags and keeps the breaks the markup implied', () => {
    expect(textOf('<p>Uno</p><p>Dos<br>Tres</p>')).toBe('Uno\nDos\nTres');
  });

  it('removes script and style content entirely', () => {
    expect(textOf('Hola<script>var a = 1;</script><style>p{}</style>')).toBe('Hola');
  });
});

describe('decodeEntities', () => {
  it('handles named, decimal and hex entities', () => {
    expect(decodeEntities('1 &frac12; tazas')).toBe('1 ½ tazas');
    expect(decodeEntities('&#8364;5')).toBe('€5');
    expect(decodeEntities('&#x2153;')).toBe('⅓');
  });

  it('builds accented letters from the mark in their name, in both cases', () => {
    expect(decodeEntities('caf&eacute; con az&uacute;car')).toBe('café con azúcar');
    expect(decodeEntities('&Ntilde;o&ntilde;o')).toBe('Ñoño');
    expect(decodeEntities('cig&uuml;e&ntilde;a')).toBe('cigüeña');
  });

  it('leaves an unknown entity alone rather than eating it', () => {
    expect(decodeEntities('a &weird; b')).toBe('a &weird; b');
  });
});
