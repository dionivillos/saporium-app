import { placeholderFor } from '@/lib/recipe-placeholder';

describe('placeholderFor', () => {
  it('is stable for the same recipe', () => {
    expect(placeholderFor('recipe-1')).toEqual(placeholderFor('recipe-1'));
  });

  it('varies between recipes', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const gradients = new Set(ids.map((id) => placeholderFor(id).colors.join()));

    expect(gradients.size).toBeGreaterThan(1);
  });

  it('always returns a gradient and a glyph', () => {
    const { colors, glyph } = placeholderFor('recipe-1');

    expect(colors).toHaveLength(2);
    expect(glyph.length).toBeGreaterThan(0);
  });

  it('picks a glyph that matches a tag', () => {
    expect(placeholderFor('recipe-1', ['postre']).glyph).toBe('🍰');
    expect(placeholderFor('recipe-1', ['pescado']).glyph).toBe('🐟');
  });

  it('matches tags regardless of case and accents', () => {
    expect(placeholderFor('recipe-1', ['Postres']).glyph).toBe('🍰');
    expect(placeholderFor('recipe-1', ['Legumbrés']).glyph).toBe('🫘');
  });

  it('lets the first matching tag win, so the order the user typed decides', () => {
    expect(placeholderFor('recipe-1', ['sopa', 'postre']).glyph).toBe('🍲');
    expect(placeholderFor('recipe-1', ['postre', 'sopa']).glyph).toBe('🍰');
  });

  it('reads the title when no tag says anything', () => {
    expect(placeholderFor('recipe-1', [], 'Lentejas de la abuela').glyph).toBe('🫘');
    expect(placeholderFor('recipe-1', ['martes'], 'Tortilla de patatas').glyph).toBe('🍳');
  });

  it('lets an explicit tag beat the title', () => {
    expect(placeholderFor('recipe-1', ['postre'], 'Tarta de lentejas').glyph).toBe('🍰');
  });

  it('falls back to a glyph seeded by the id when nothing says anything', () => {
    const bare = placeholderFor('recipe-1');
    const unknown = placeholderFor('recipe-1', ['martes'], 'Lo de siempre');

    expect(unknown.glyph).toBe(bare.glyph);
  });

  it('keeps the gradient independent of the tags', () => {
    expect(placeholderFor('recipe-1', ['postre']).colors).toEqual(
      placeholderFor('recipe-1').colors
    );
  });
});
