import { foldForSearch } from '@/lib/search-text';

/**
 * A recipe without a photo should look deliberate, not broken. Every recipe gets
 * a warm gradient and a glyph, both derived from what the recipe already is, so
 * the same recipe always looks the same and no state has to be stored.
 */
export type Placeholder = {
  /** Two stops, dark enough for white text and the glyph to sit on. */
  colors: readonly [string, string];
  glyph: string;
};

/** Warm and food-adjacent, and each one keeps a light glyph legible on top. */
const GRADIENTS: readonly (readonly [string, string])[] = [
  ['#C97B3F', '#8A4B2A'],
  ['#B5654B', '#7A3B33'],
  ['#8C8F4A', '#57612F'],
  ['#A85C6B', '#6E3446'],
  ['#7E7A5E', '#4E4A38'],
  ['#C08A3E', '#7E5522'],
  ['#6E8A73', '#3F5747'],
  ['#A2673F', '#6B3D26'],
];

/**
 * Keywords worth recognising, folded and in both shipped languages. Matched
 * against the tags first and then the title, so an explicit tag always beats a
 * word that happens to appear in the name.
 */
const GLYPH_BY_KEYWORD: readonly (readonly [string, string])[] = [
  ['postre', '🍰'],
  ['dessert', '🍰'],
  ['dulce', '🍰'],
  ['tarta', '🎂'],
  ['bizcocho', '🎂'],
  ['cake', '🎂'],
  ['pan', '🍞'],
  ['bread', '🍞'],
  ['masa', '🍞'],
  ['sopa', '🍲'],
  ['soup', '🍲'],
  ['caldo', '🍲'],
  ['crema', '🥣'],
  ['pure', '🥣'],
  ['guiso', '🥘'],
  ['stew', '🥘'],
  ['lenteja', '🫘'],
  ['garbanzo', '🫘'],
  ['alubia', '🫘'],
  ['judia', '🫘'],
  ['legumbre', '🫘'],
  ['bean', '🫘'],
  ['ensalada', '🥗'],
  ['salad', '🥗'],
  ['verdura', '🥦'],
  ['vegetal', '🥦'],
  ['vegano', '🌱'],
  ['vegetarian', '🌱'],
  ['pasta', '🍝'],
  ['macarron', '🍝'],
  ['espagueti', '🍝'],
  ['arroz', '🍚'],
  ['paella', '🥘'],
  ['rice', '🍚'],
  ['pescado', '🐟'],
  ['merluza', '🐟'],
  ['bacalao', '🐟'],
  ['salmon', '🐟'],
  ['fish', '🐟'],
  ['marisco', '🦐'],
  ['gamba', '🦐'],
  ['carne', '🥩'],
  ['filete', '🥩'],
  ['ternera', '🥩'],
  ['cerdo', '🥩'],
  ['meat', '🥩'],
  ['pollo', '🍗'],
  ['chicken', '🍗'],
  ['tortilla', '🍳'],
  ['huevo', '🍳'],
  ['egg', '🍳'],
  ['patata', '🥔'],
  ['potato', '🥔'],
  ['desayuno', '🥐'],
  ['breakfast', '🥐'],
  ['bebida', '🥤'],
  ['drink', '🥤'],
  ['salsa', '🥄'],
  ['sauce', '🥄'],
  ['picante', '🌶️'],
  ['spicy', '🌶️'],
];

/** Used when no tag says anything; still varies so a shelf of them has rhythm. */
const FALLBACK_GLYPHS = ['🍲', '🥘', '🍳', '🥣', '🧄', '🫕', '🍋', '🌿'] as const;

/** FNV-1a. Any stable spread would do; this one is short and has no dependencies. */
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/** The modulo is always in range; this only spells that out for the type checker. */
function pick<T>(table: readonly T[], seed: number): T {
  const item = table[seed % table.length];
  if (item === undefined) throw new Error('Placeholder table is empty');
  return item;
}

function glyphForText(text: string): string | undefined {
  const folded = foldForSearch(text);
  return GLYPH_BY_KEYWORD.find(([keyword]) => folded.includes(keyword))?.[1];
}

function glyphFor(id: string, tags: readonly string[], title: string): string {
  for (const tag of tags) {
    const glyph = glyphForText(tag);
    if (glyph !== undefined) return glyph;
  }

  return glyphForText(title) ?? pick(FALLBACK_GLYPHS, hash(id));
}

export function placeholderFor(id: string, tags: readonly string[] = [], title = ''): Placeholder {
  return { colors: pick(GRADIENTS, hash(id)), glyph: glyphFor(id, tags, title) };
}
