import { escapeLikePattern, foldForSearch } from '@/lib/search-text';

describe('foldForSearch', () => {
  it('lowercases', () => {
    expect(foldForSearch('Lentejas')).toBe('lentejas');
  });

  it('strips the accents Spanish uses', () => {
    expect(foldForSearch('Puré de jamón con azúcar y ñoquis')).toBe(
      'pure de jamon con azucar y noquis'
    );
  });

  it('folds accented capitals, which lowercase alone would leave alone', () => {
    expect(foldForSearch('ÁÉÍÓÚÑÜÇ')).toBe('aeiounuc');
  });

  it('leaves everything else untouched', () => {
    expect(foldForSearch('50% 1/2 café-au-lait')).toBe('50% 1/2 cafe-au-lait');
  });
});

describe('escapeLikePattern', () => {
  it('escapes the wildcards a user can type', () => {
    expect(escapeLikePattern('50%')).toBe('50\\%');
    expect(escapeLikePattern('a_b')).toBe('a\\_b');
  });

  it('escapes the escape character itself', () => {
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
  });

  it('leaves ordinary text alone', () => {
    expect(escapeLikePattern('lentejas')).toBe('lentejas');
  });
});
