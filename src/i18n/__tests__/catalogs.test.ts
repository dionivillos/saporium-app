import en from '@/i18n/messages/en.json';
import es from '@/i18n/messages/es.json';

/**
 * The Spanish catalog is the reference: `t()` keys are type-checked against it,
 * so a key missing there is a compile error, while a key missing from English
 * would only show up as a Spanish word in an English app. This is the guard for
 * the second case.
 */
type Catalog = { [key: string]: string | Catalog };

function paths(catalog: Catalog, prefix = ''): string[] {
  return Object.entries(catalog).flatMap(([key, value]) => {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    return typeof value === 'string' ? [path] : paths(value, path);
  });
}

const spanish = paths(es as Catalog).sort();
const english = paths(en as Catalog).sort();

function interpolations(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1] ?? '').sort();
}

function valueAt(catalog: Catalog, path: string): string {
  const value = path.split('.').reduce<string | Catalog | undefined>((node, key) => {
    return typeof node === 'object' && node !== null ? node[key] : undefined;
  }, catalog);

  return typeof value === 'string' ? value : '';
}

describe('message catalogs', () => {
  it('ships English for every Spanish message', () => {
    expect(spanish.filter((key) => !english.includes(key))).toEqual([]);
  });

  it('has no English message the Spanish catalog does not have', () => {
    expect(english.filter((key) => !spanish.includes(key))).toEqual([]);
  });

  it('uses the same interpolations in both, so neither renders a raw {{name}}', () => {
    const mismatched = spanish.filter((key) => {
      const there = interpolations(valueAt(es as Catalog, key));
      const here = interpolations(valueAt(en as Catalog, key));
      return there.join() !== here.join();
    });

    expect(mismatched).toEqual([]);
  });

  it('leaves nothing untranslated by accident', () => {
    const empty = english.filter((key) => valueAt(en as Catalog, key).trim().length === 0);

    expect(empty).toEqual([]);
  });

  it('gives both plural forms wherever Spanish has them', () => {
    const plurals = spanish.filter((key) => key.endsWith('_one'));

    for (const one of plurals) {
      expect(english).toContain(one.replace(/_one$/, '_other'));
    }
  });
});
