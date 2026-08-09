import { extractRecipes, fromSchemaOrgRecipe } from '@/lib/schema-org';
import type { CreateRecipeInput } from '@/validations/recipe';

/**
 * Pulls a recipe out of a web page.
 *
 * Almost every recipe site embeds schema.org/Recipe as JSON-LD for search
 * engines, so the reverse mapper written for JSON import does the real work
 * here too — this module only has to find the payload. Microdata is a
 * best-effort fallback for the older sites that never moved to JSON-LD.
 *
 * There is no DOM on the device, so the extraction is regex-based. That is
 * fine for finding a script tag or a labelled attribute, and deliberately not
 * trusted for anything more: whatever is found is handed to the same validation
 * every other import path goes through.
 */

const JSON_LD =
  /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** Every JSON-LD block that parses; malformed ones are skipped, not fatal. */
export function extractJsonLd(html: string): unknown[] {
  const documents: unknown[] = [];

  for (const match of html.matchAll(JSON_LD)) {
    const body = match[1];
    if (body === undefined) continue;

    try {
      documents.push(JSON.parse(stripCdata(body)));
    } catch {
      // A broken block on a page says nothing about the others.
    }
  }

  return documents;
}

/** The `//` form is what CMSs emit so the marker is also a JavaScript comment. */
function stripCdata(text: string): string {
  return text.replace(/^\s*(?:\/\/)?\s*<!\[CDATA\[/, '').replace(/(?:\/\/)?\s*\]\]>\s*$/, '');
}

export function recipeFromHtml(html: string): CreateRecipeInput | null {
  for (const document of extractJsonLd(html)) {
    for (const node of extractRecipes(document)) {
      const recipe = fromSchemaOrgRecipe(node);
      if (recipe !== null) return recipe;
    }
  }

  return recipeFromMicrodata(html);
}

const MICRODATA_SCOPE = /itemtype\s*=\s*["'][^"']*schema\.org\/Recipe["']/i;

/**
 * Reads `itemprop` values from the first Recipe scope onwards. Without a parser
 * the scope cannot be closed properly, so this over-reads rather than
 * under-reads: a page with one recipe is the case worth getting right.
 */
export function recipeFromMicrodata(html: string): CreateRecipeInput | null {
  const scope = html.search(MICRODATA_SCOPE);
  if (scope === -1) return null;

  const body = html.slice(scope);

  const name = firstProperty(body, 'name');
  const ingredients = allProperties(body, 'recipeIngredient');
  const instructions = allProperties(body, 'recipeInstructions');

  if (name === null || ingredients.length === 0 || instructions.length === 0) return null;

  return fromSchemaOrgRecipe({
    '@type': 'Recipe',
    name,
    description: firstProperty(body, 'description') ?? undefined,
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
    prepTime: firstProperty(body, 'prepTime') ?? undefined,
    cookTime: firstProperty(body, 'cookTime') ?? undefined,
    totalTime: firstProperty(body, 'totalTime') ?? undefined,
    recipeYield: firstProperty(body, 'recipeYield') ?? undefined,
  });
}

function propertyPattern(property: string): RegExp {
  // Either a <meta … content="…"> or an element whose text is the value.
  return new RegExp(
    `<(\\w+)\\b[^>]*itemprop\\s*=\\s*["']${property}["']([^>]*)>([\\s\\S]*?)<\\/\\1>|` +
      `<meta\\b[^>]*itemprop\\s*=\\s*["']${property}["'][^>]*>`,
    'gi'
  );
}

function allProperties(html: string, property: string): string[] {
  const values: string[] = [];

  for (const match of html.matchAll(propertyPattern(property))) {
    const attributes = match[2] ?? '';
    const inner = match[3];

    const value =
      inner === undefined || inner === ''
        ? (attributeValue(match[0], 'content') ?? '')
        : (attributeValue(attributes, 'content') ?? textOf(inner));

    const trimmed = value.trim();
    if (trimmed.length > 0) values.push(trimmed);
  }

  return values;
}

function firstProperty(html: string, property: string): string | null {
  return allProperties(html, property)[0] ?? null;
}

function attributeValue(html: string, attribute: string): string | null {
  const match = new RegExp(`${attribute}\\s*=\\s*["']([^"']*)["']`, 'i').exec(html);
  return match?.[1] ?? null;
}

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  deg: '°',
  ordm: 'º',
  ordf: 'ª',
  iexcl: '¡',
  iquest: '¿',
  laquo: '«',
  raquo: '»',
  middot: '·',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  times: '×',
  divide: '÷',
  euro: '€',
  pound: '£',
  plusmn: '±',
};

/**
 * `&aacute;` and friends are a letter plus a combining mark, so they are built
 * rather than listed — that covers the whole Latin-1 set in both cases, which
 * on a Spanish recipe site is most of the entities on the page.
 */
const COMBINING: Readonly<Record<string, string>> = {
  grave: '̀',
  acute: '́',
  circ: '̂',
  tilde: '̃',
  uml: '̈',
  ring: '̊',
  cedil: '̧',
};

const ACCENTED = /^([a-z])(grave|acute|circ|tilde|uml|ring|cedil)$/i;

function namedEntity(name: string): string | undefined {
  const known = ENTITIES[name.toLowerCase()];
  if (known !== undefined) return known;

  const match = ACCENTED.exec(name);
  const letter = match?.[1];
  const mark = match?.[2] === undefined ? undefined : COMBINING[match[2].toLowerCase()];

  return letter === undefined || mark === undefined ? undefined : (letter + mark).normalize('NFC');
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => codePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, digits: string) => codePoint(Number(digits)))
    .replace(/&([a-z0-9]+);/gi, (whole, name: string) => namedEntity(name) ?? whole);
}

function codePoint(value: number): string {
  return Number.isFinite(value) && value > 0 && value <= 0x10ffff
    ? String.fromCodePoint(value)
    : '';
}

/** Tag soup to readable text, keeping the line breaks the markup implied. */
export function textOf(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}
