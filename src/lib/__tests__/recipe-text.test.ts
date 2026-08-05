import {
  ingredientsToText,
  numberToText,
  parseIngredientLines,
  parseOptionalNumber,
  parseStepText,
  parseTagText,
  stepsToText,
  tagsToText,
} from '@/lib/recipe-text';

describe('parseIngredientLines', () => {
  it('makes one ingredient per line and keeps the line verbatim', () => {
    expect(parseIngredientLines('500 g de patatas\n4 huevos')).toEqual([
      { name: '500 g de patatas', rawText: '500 g de patatas' },
      { name: '4 huevos', rawText: '4 huevos' },
    ]);
  });

  it('ignores blank lines and stray whitespace', () => {
    expect(parseIngredientLines('  sal  \n\n\n  pimienta\n')).toHaveLength(2);
  });

  it('returns nothing for empty text', () => {
    expect(parseIngredientLines('   \n  ')).toEqual([]);
  });
});

describe('parseStepText', () => {
  it('splits on blank lines when the user wrote paragraphs', () => {
    const steps = parseStepText('Pela las patatas.\nCórtalas finas.\n\nBate los huevos.');

    expect(steps.map((step) => step.content)).toEqual([
      'Pela las patatas.\nCórtalas finas.',
      'Bate los huevos.',
    ]);
  });

  it('falls back to one step per line when there are no paragraphs', () => {
    const steps = parseStepText('Paso uno\nPaso dos\nPaso tres');

    expect(steps).toHaveLength(3);
  });
});

describe('round trip through text', () => {
  it('survives ingredients going out and back', () => {
    const text = '500 g de patatas\n4 huevos';

    expect(ingredientsToText(parseIngredientLines(text))).toBe(text);
  });

  it('survives steps going out and back', () => {
    const text = 'Primero esto.\n\nDespués lo otro.';

    expect(stepsToText(parseStepText(text))).toBe(text);
  });

  it('falls back to the name when an ingredient has no original line', () => {
    expect(ingredientsToText([{ rawText: null, name: 'Sal' }])).toBe('Sal');
  });
});

describe('parseTagText', () => {
  it('accepts commas and newlines, lowercases and de-duplicates', () => {
    expect(parseTagText('Cena, POSTRE\ncena')).toEqual(['cena', 'postre']);
  });

  it('round-trips through text', () => {
    expect(tagsToText(parseTagText('cena, postre'))).toBe('cena, postre');
  });
});

describe('parseOptionalNumber', () => {
  it('reads whole numbers', () => {
    expect(parseOptionalNumber('45')).toBe(45);
    expect(parseOptionalNumber(' 45 ')).toBe(45);
  });

  it('treats empty input as unset rather than zero', () => {
    expect(parseOptionalNumber('')).toBeNull();
    expect(parseOptionalNumber('   ')).toBeNull();
  });

  it('rejects text and negatives', () => {
    expect(parseOptionalNumber('mucho rato')).toBeNull();
    expect(parseOptionalNumber('-5')).toBeNull();
  });

  it('round-trips through text', () => {
    expect(numberToText(parseOptionalNumber('30'))).toBe('30');
    expect(numberToText(null)).toBe('');
  });
});
